import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { listEntries } from "./guestbook";
import { createTestDb } from "./test-db";

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

describe("listEntries", () => {
  it("글이 없으면 빈 목록을 돌려준다", async () => {
    expect(await listEntries(db)).toEqual([]);
  });
});
