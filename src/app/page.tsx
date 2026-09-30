import { connection } from "next/server";
import { getDb } from "@/db";
import { listEntries } from "@/lib/guestbook";

export default async function Home() {
  await connection();
  const entries = await listEntries(getDb());

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">방명록</h1>
          <p className="mt-1 text-slate-500">자유롭게 인사를 남겨주세요.</p>
        </header>

        <section aria-label="글 목록">
          {entries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              아직 글이 없습니다.
            </p>
          ) : (
            <ul className="space-y-3">
              {entries.map((e) => (
                <li key={e.id} className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="font-semibold">{e.authorName}</p>
                  <p className="whitespace-pre-wrap">{e.message}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-200 py-4 text-center text-sm text-slate-500">
        개발자: 안한석 (202304248)
      </footer>
    </div>
  );
}
