import { connection } from "next/server";
import { EntryCard } from "@/components/EntryCard";
import { EntryForm } from "@/components/EntryForm";
import { getDb } from "@/db";
import { formatKst } from "@/lib/format";
import { listEntries } from "@/lib/guestbook";

export default async function Home() {
  await connection();
  const entries = await listEntries(getDb());

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <header className="mb-8 text-center">
          <p className="text-4xl" aria-hidden>
            ✍️
          </p>
          <h1 className="mt-2 text-3xl font-bold text-stone-800">방명록</h1>
          <p className="mt-2 text-stone-500">다녀가신 흔적을 남겨주세요. 따뜻한 한마디도 좋아요 :)</p>
        </header>

        <EntryForm />

        <section aria-label="글 목록" className="mt-10">
          <h2 className="mb-3 text-sm font-semibold text-stone-500">
            💬 남겨진 글 <span className="text-amber-700">{entries.length}</span>개
          </h2>
          {entries.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-amber-200 bg-white/60 p-8 text-center text-stone-500">
              아직 글이 없습니다.
            </p>
          ) : (
            <ul className="space-y-3">
              {entries.map((e) => (
                <EntryCard
                  key={e.id}
                  id={e.id}
                  authorName={e.authorName}
                  message={e.message}
                  createdAt={formatKst(e.createdAt)}
                  updatedAt={e.updatedAt ? formatKst(e.updatedAt) : null}
                />
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="border-t border-amber-100 bg-white/70 py-5 text-center text-lg font-semibold text-black">
        개발자: 안한석 (202304248)
      </footer>
    </div>
  );
}
