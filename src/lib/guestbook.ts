import { desc } from "drizzle-orm";
import type { Db } from "@/db";
import { entries } from "@/db/schema";

/** 목록에 보여줄 글. 비밀번호 해시와 실패 기록은 포함하지 않는다. */
export type EntryView = {
  id: number;
  authorName: string;
  message: string;
  createdAt: Date;
  updatedAt: Date | null;
};

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
