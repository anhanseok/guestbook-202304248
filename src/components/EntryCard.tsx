"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteEntryAction, editEntryAction, type FormState } from "@/app/actions";
import { LIMITS } from "@/lib/guestbook-limits";
import { FieldError, ghostButton, inputClass, primaryButton, secondaryButton } from "./ui";

const AVATAR_COLORS = [
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
];

type Props = {
  id: number;
  authorName: string;
  message: string;
  createdAt: string;
  updatedAt: string | null;
};

type Mode = "view" | "edit" | "delete";

export function EntryCard(entry: Props) {
  const [mode, setMode] = useState<Mode>("view");
  const close = () => setMode("view");

  return (
    <li className="flex gap-3 rounded-2xl border border-amber-100 bg-white p-4 shadow-sm shadow-amber-900/5">
      <div
        aria-hidden
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold ${
          AVATAR_COLORS[entry.id % AVATAR_COLORS.length]
        }`}
      >
        {[...entry.authorName][0]}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-stone-800">{entry.authorName}</p>
            <p className="text-xs text-stone-400">
              {entry.createdAt}
              {entry.updatedAt && <span> · (수정됨 {entry.updatedAt})</span>}
            </p>
          </div>
          {mode === "view" && (
            <div className="flex shrink-0">
              <button type="button" onClick={() => setMode("edit")} className={ghostButton}>
                수정
              </button>
              <button type="button" onClick={() => setMode("delete")} className={ghostButton}>
                삭제
              </button>
            </div>
          )}
        </div>

        {mode === "edit" ? (
          <EditForm entry={entry} onDone={close} />
        ) : (
          <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed text-stone-700">{entry.message}</p>
        )}

        {mode === "delete" && <DeleteForm id={entry.id} onCancel={close} />}
      </div>
    </li>
  );
}

function EditForm({ entry, onDone }: { entry: Props; onDone: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(editEntryAction, { status: "idle" });
  const [length, setLength] = useState(entry.message.length);

  useEffect(() => {
    if (state.status === "success") onDone();
    // onDone은 렌더마다 새로 만들어지므로 결과가 바뀔 때만 반응한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="id" value={entry.id} />
      <textarea
        name="message"
        rows={3}
        maxLength={LIMITS.message.max}
        defaultValue={state.values?.message ?? entry.message}
        onChange={(e) => setLength(e.target.value.length)}
        className={inputClass}
        aria-label="메시지 수정"
      />
      <div className="flex justify-between">
        <FieldError>{state.errors?.message}</FieldError>
        <span className="ml-auto text-xs text-slate-400">
          {length}/{LIMITS.message.max}
        </span>
      </div>
      <PasswordRow pending={pending} submitLabel="수정" onCancel={onDone} error={state.message} />
    </form>
  );
}

function DeleteForm({ id, onCancel }: { id: number; onCancel: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(deleteEntryAction, { status: "idle" });

  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="id" value={id} />
      <PasswordRow pending={pending} submitLabel="삭제" onCancel={onCancel} error={state.message} />
    </form>
  );
}

function PasswordRow(props: { pending: boolean; submitLabel: string; onCancel: () => void; error?: string }) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <input
          name="password"
          type="password"
          placeholder="비밀번호"
          aria-label="비밀번호 확인"
          maxLength={LIMITS.password.max}
          autoFocus
          className={`${inputClass} min-w-0 flex-1`}
        />
        <button type="submit" disabled={props.pending} className={primaryButton}>
          {props.pending ? "확인 중…" : props.submitLabel}
        </button>
        <button type="button" onClick={props.onCancel} className={secondaryButton}>
          취소
        </button>
      </div>
      <FieldError>{props.error}</FieldError>
    </div>
  );
}
