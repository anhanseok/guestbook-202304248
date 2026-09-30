import bcrypt from "bcryptjs";
import { and, desc, eq, isNull, lte, or, sql } from "drizzle-orm";
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
  | { ok: false; reason: "wrong_password"; remainingAttempts: number }
  | { ok: false; reason: "locked"; retryAfterMinutes: number };

/** 한 글에 연속으로 틀릴 수 있는 횟수와 잠금 시간 (ADR 0001) */
export const MAX_ATTEMPTS = 10;
export const LOCK_MINUTES = 5;

const LABELS = { authorName: "이름", message: "메시지", password: "비밀번호" } as const;

function checkLength(field: keyof typeof LIMITS, value: string, errors: FieldErrors) {
  const { min, max } = LIMITS[field];
  const len = [...value].length;
  if (len < min) errors[field] = `${LABELS[field]}을(를) ${min === 1 ? "입력해주세요" : `${min}자 이상 입력해주세요`}.`;
  else if (len > max) errors[field] = `${LABELS[field]}은(는) ${max}자 이하로 입력해주세요.`;
}

const hasErrors = (e: FieldErrors) => Object.keys(e).length > 0;

/** 브라우저가 textarea 줄바꿈을 CRLF로 보내므로, 화면의 글자 수와 맞게 LF로 통일한다. */
const normalizeMessage = (m: string) => m.replace(/\r\n?/g, "\n").trim();

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
  const message = normalizeMessage(input.message);
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

/** 이 글이 잠겨 있지 않을 때만 걸리는 조건. 비밀번호 비교 사이에 잠겼으면 쓰기를 막는다. */
const notLocked = (id: number, now: Date) =>
  and(eq(entries.id, id), or(isNull(entries.lockedUntil), lte(entries.lockedUntil, now)));

/** 쓰기가 한 행도 바꾸지 못한 이유: 그새 삭제됐거나, 그새 잠겼다. */
async function whyNothingChanged(db: Db, id: number, now: Date): Promise<ModifyResult> {
  const [row] = await db.select({ lockedUntil: entries.lockedUntil }).from(entries).where(eq(entries.id, id));
  if (!row) return { ok: false, reason: "not_found" };
  return { ok: false, reason: "locked", retryAfterMinutes: row.lockedUntil ? minutesUntil(row.lockedUntil, now) : LOCK_MINUTES };
}

const minutesUntil = (until: Date, now: Date) => Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 60_000));

/**
 * 비밀번호를 확인한다. 통과하면 null, 아니면 거부 결과를 돌려준다.
 * 틀리면 그 글의 연속 실패 횟수를 올리고, MAX_ATTEMPTS번째에 잠근다.
 */
async function authorize(db: Db, id: number, password: string, now: Date): Promise<ModifyResult | null> {
  if (!Number.isSafeInteger(id) || id < 1) return { ok: false, reason: "not_found" };
  const [row] = await db
    .select({ passwordHash: entries.passwordHash, lockedUntil: entries.lockedUntil })
    .from(entries)
    .where(eq(entries.id, id));
  if (!row) return { ok: false, reason: "not_found" };
  if (row.lockedUntil && row.lockedUntil > now) {
    return { ok: false, reason: "locked", retryAfterMinutes: minutesUntil(row.lockedUntil, now) };
  }
  if (await bcrypt.compare(password.trim(), row.passwordHash)) return null;

  // 한 번의 UPDATE로 올려서 동시 요청에도 횟수가 어긋나지 않게 한다.
  // 잠금이 풀린 뒤의 첫 실패는 1회째부터 다시 센다.
  const next = sql<number>`CASE WHEN ${entries.lockedUntil} IS NOT NULL THEN 1 ELSE ${entries.failedAttempts} + 1 END`;
  const lockUntil = new Date(now.getTime() + LOCK_MINUTES * 60_000);
  const [counted] = await db
    .update(entries)
    .set({
      failedAttempts: next,
      lockedUntil: sql`CASE WHEN (${next}) >= ${MAX_ATTEMPTS} THEN ${lockUntil.toISOString()}::timestamptz ELSE NULL END`,
    })
    .where(notLocked(id, now))
    .returning({ failedAttempts: entries.failedAttempts, lockedUntil: entries.lockedUntil });

  if (!counted) return { ok: false, reason: "locked", retryAfterMinutes: LOCK_MINUTES };
  if (counted.lockedUntil) return { ok: false, reason: "locked", retryAfterMinutes: minutesUntil(counted.lockedUntil, now) };
  return { ok: false, reason: "wrong_password", remainingAttempts: MAX_ATTEMPTS - counted.failedAttempts };
}

export async function editEntry(
  db: Db,
  input: { id: number; message: string; password: string },
  now: Date,
): Promise<ModifyResult> {
  const message = normalizeMessage(input.message);
  const errors: FieldErrors = {};
  checkLength("message", message, errors);
  if (hasErrors(errors)) return { ok: false, reason: "invalid", errors };

  const denied = await authorize(db, input.id, input.password, now);
  if (denied) return denied;

  const updated = await db
    .update(entries)
    .set({ message, updatedAt: now, failedAttempts: 0, lockedUntil: null })
    .where(notLocked(input.id, now))
    .returning({ id: entries.id });
  return updated.length ? { ok: true } : whyNothingChanged(db, input.id, now);
}

export async function deleteEntry(
  db: Db,
  input: { id: number; password: string },
  now: Date,
): Promise<ModifyResult> {
  const denied = await authorize(db, input.id, input.password, now);
  if (denied) return denied;

  const deleted = await db
    .delete(entries)
    .where(notLocked(input.id, now))
    .returning({ id: entries.id });
  return deleted.length ? { ok: true } : whyNothingChanged(db, input.id, now);
}
