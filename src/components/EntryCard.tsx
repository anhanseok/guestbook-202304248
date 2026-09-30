"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteEntryAction, editEntryAction, type FormState } from "@/app/actions";
import { LIMITS } from "@/lib/guestbook-limits";
import { FieldError, inputClass, primaryButton, secondaryButton } from "./ui";

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
    <li className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">{entry.authorName}</p>
        <p className="text-xs text-slate-400">
          {entry.createdAt}
          {entry.updatedAt && <span> · (수정됨 {entry.updatedAt})</span>}
        </p>
      </div>

      {mode === "edit" ? (
        <EditForm entry={entry} onDone={close} />
      ) : (
        <p className="mt-2 whitespace-pre-wrap break-words">{entry.message}</p>
      )}

      {mode === "delete" && <DeleteForm id={entry.id} onCancel={close} />}

      {mode === "view" && (
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={() => setMode("edit")} className={secondaryButton}>
            수정
          </button>
          <button type="button" onClick={() => setMode("delete")} className={secondaryButton}>
            삭제
          </button>
        </div>
      )}
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
