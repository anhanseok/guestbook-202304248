"use client";

import { useActionState, useState } from "react";
import { createEntryAction, type FormState } from "@/app/actions";
import { LIMITS } from "@/lib/guestbook-limits";
import { FieldError, inputClass, primaryButton } from "./ui";

export function EntryForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createEntryAction, { status: "idle" });
  const [length, setLength] = useState(0);

  // React가 제출 후 폼을 기본값으로 되돌리므로, 글자 수도 새 결과에 맞춘다
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    setLength(state.values?.message.length ?? 0);
  }

  const v = state.status === "error" ? state.values : undefined;

  return (
    <form action={action} className="space-y-3 rounded-2xl border border-amber-100 bg-white p-5 shadow-md shadow-amber-900/5">
      <p className="font-semibold text-stone-700">📝 방명록을 남겨주세요</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <input
            name="authorName"
            placeholder="이름"
            aria-label="이름"
            maxLength={LIMITS.authorName.max}
            defaultValue={v?.authorName}
            className={inputClass}
          />
          <FieldError>{state.errors?.authorName}</FieldError>
        </div>
        <div>
          <input
            name="password"
            type="password"
            placeholder="비밀번호 (4~20자)"
            aria-label="비밀번호"
            maxLength={LIMITS.password.max}
            className={inputClass}
          />
          <FieldError>{state.errors?.password}</FieldError>
        </div>
      </div>
      <div>
        <textarea
          name="message"
          placeholder="메시지를 남겨주세요"
          aria-label="메시지"
          rows={3}
          maxLength={LIMITS.message.max}
          defaultValue={v?.message}
          onChange={(e) => setLength(e.target.value.length)}
          className={inputClass}
        />
        <div className="flex justify-between">
          <FieldError>{state.errors?.message}</FieldError>
          <span className="ml-auto mt-1 text-xs text-slate-400">
            {length}/{LIMITS.message.max}
          </span>
        </div>
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "남기는 중…" : "남기기"}
        </button>
      </div>
    </form>
  );
}
