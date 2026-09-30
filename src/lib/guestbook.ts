import bcrypt from "bcryptjs";
import { desc, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { entries } from "@/db/schema";
import { LIMITS } from "./guestbook-limits";

export { LIMITS };

/** 목록에 보여줄 글. 비밀번호 해시와 실패 기록은 포함하지 않는다. */
export type EntryView = {
  id: number;
  authorName: string;
  message: string;
  createdAt: Date;
  updatedAt: Date | null;
};

export type FieldErrors = Partial<Record<"authorName" | "message" | "password", string>>;

export type CreateResult = { ok: true; id: number } | { ok: false; reason: "invalid"; errors: FieldErrors };

export type ModifyResult =
  | { ok: true }
  | { ok: false; reason: "invalid"; errors: FieldErrors }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "wrong_password" };

const LABELS = { authorName: "이름", message: "메시지", password: "비밀번호" } as const;

function checkLength(field: keyof typeof LIMITS, value: string, errors: FieldErrors) {
  const { min, max } = LIMITS[field];
  const len = [...value].length;
  if (len < min) errors[field] = `${LABELS[field]}을(를) ${min === 1 ? "입력해주세요" : `${min}자 이상 입력해주세요`}.`;
  else if (len > max) errors[field] = `${LABELS[field]}은(는) ${max}자 이하로 입력해주세요.`;
}

const hasErrors = (e: FieldErrors) => Object.keys(e).length > 0;

export async function listEntries(db: Db): Promise<EntryView[]> {
  return db
    .select({
      id: entries.id,
      authorName: entries.authorName,
      message: entries.message,
      createdAt: entries.createdAt,
      updatedAt: entries.updatedAt,
    })
    .from(entries)
    .orderBy(desc(entries.createdAt), desc(entries.id));
}

export async function createEntry(
  db: Db,
  input: { authorName: string; message: string; password: string },
  now: Date,
): Promise<CreateResult> {
  const authorName = input.authorName.trim();
  const message = input.message.trim();
  const password = input.password.trim();
  const errors: FieldErrors = {};
  checkLength("authorName", authorName, errors);
  checkLength("message", message, errors);
  checkLength("password", password, errors);
  if (hasErrors(errors)) return { ok: false, reason: "invalid", errors };

  const [row] = await db
    .insert(entries)
    .values({ authorName, message, passwordHash: await bcrypt.hash(password, 10), createdAt: now })
    .returning({ id: entries.id });
  return { ok: true, id: row.id };
}

/** 비밀번호를 확인한다. 통과하면 null, 아니면 거부 결과를 돌려준다. */
async function authorize(db: Db, id: number, password: string): Promise<ModifyResult | null> {
  const [row] = await db
    .select({ passwordHash: entries.passwordHash })
    .from(entries)
    .where(eq(entries.id, id));
  if (!row) return { ok: false, reason: "not_found" };
  if (!(await bcrypt.compare(password.trim(), row.passwordHash))) return { ok: false, reason: "wrong_password" };
  return null;
}

export async function editEntry(
  db: Db,
  input: { id: number; message: string; password: string },
  now: Date,
): Promise<ModifyResult> {
  const message = input.message.trim();
  const errors: FieldErrors = {};
  checkLength("message", message, errors);
  if (hasErrors(errors)) return { ok: false, reason: "invalid", errors };

  const denied = await authorize(db, input.id, input.password);
  if (denied) return denied;

  const updated = await db
    .update(entries)
    .set({ message, updatedAt: now })
    .where(eq(entries.id, input.id))
    .returning({ id: entries.id });
  return updated.length ? { ok: true } : { ok: false, reason: "not_found" };
}

export async function deleteEntry(
  db: Db,
  input: { id: number; password: string },
): Promise<ModifyResult> {
  const denied = await authorize(db, input.id, input.password);
  if (denied) return denied;

  const deleted = await db
    .delete(entries)
    .where(eq(entries.id, input.id))
    .returning({ id: entries.id });
  return deleted.length ? { ok: true } : { ok: false, reason: "not_found" };
}
