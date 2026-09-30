"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { createEntry, deleteEntry, editEntry, type FieldErrors, type ModifyResult } from "@/lib/guestbook";

export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: FieldErrors;
  values?: Record<string, string>;
};

const str = (f: FormData, k: string) => String(f.get(k) ?? "");

function denialMessage(r: Exclude<ModifyResult, { ok: true }>): string | undefined {
  switch (r.reason) {
    case "wrong_password":
      return "비밀번호가 일치하지 않습니다.";
    case "not_found":
      return "글을 찾을 수 없습니다.";
    case "invalid":
      return undefined;
  }
}

function toState(r: ModifyResult, values: Record<string, string>): FormState {
  if (r.ok) {
    revalidatePath("/");
    return { status: "success" };
  }
  return {
    status: "error",
    message: denialMessage(r),
    errors: r.reason === "invalid" ? r.errors : undefined,
    values,
  };
}

export async function createEntryAction(_: FormState, form: FormData): Promise<FormState> {
  const values = { authorName: str(form, "authorName"), message: str(form, "message") };
  const r = await createEntry(getDb(), { ...values, password: str(form, "password") }, new Date());
  if (!r.ok) return { status: "error", errors: r.errors, values };
  revalidatePath("/");
  return { status: "success" };
}

export async function editEntryAction(_: FormState, form: FormData): Promise<FormState> {
  const values = { message: str(form, "message") };
  const r = await editEntry(
    getDb(),
    { id: Number(form.get("id")), message: values.message, password: str(form, "password") },
    new Date(),
  );
  return toState(r, values);
}

export async function deleteEntryAction(_: FormState, form: FormData): Promise<FormState> {
  const r = await deleteEntry(getDb(), { id: Number(form.get("id")), password: str(form, "password") });
  return toState(r, {});
}
