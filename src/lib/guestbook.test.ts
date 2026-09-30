import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { createEntry, deleteEntry, editEntry, listEntries } from "./guestbook";
import { createTestDb } from "./test-db";

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

const t0 = new Date("2026-09-30T05:00:00Z");
const at = (min: number) => new Date(t0.getTime() + min * 60_000);

async function write(authorName = "안한석", message = "안녕하세요", password = "1234", now = t0) {
  const r = await createEntry(db, { authorName, message, password }, now);
  if (!r.ok) throw new Error("작성 실패");
  return r.id;
}

describe("작성과 조회", () => {
  it("글이 없으면 빈 목록을 돌려준다", async () => {
    expect(await listEntries(db)).toEqual([]);
  });

  it("작성한 글이 최신 작성 순으로 보이고, 비밀번호 해시는 노출되지 않는다", async () => {
    await write("첫째", "먼저", "1234", at(0));
    await write("둘째", "나중", "1234", at(1));
    const list = await listEntries(db);
    expect(list.map((e) => e.authorName)).toEqual(["둘째", "첫째"]);
    expect(Object.keys(list[0])).not.toContain("passwordHash");
  });

  it("앞뒤 공백을 지우고 길이 규칙을 어기면 필드별로 거부한다", async () => {
    const r = await createEntry(db, { authorName: "   ", message: "a".repeat(501), password: "123" }, t0);
    expect(r).toMatchObject({ ok: false, reason: "invalid" });
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["authorName", "message", "password"]);
    expect(await listEntries(db)).toEqual([]);
  });
});

describe("수정", () => {
  it("올바른 비밀번호면 메시지만 바뀌고 수정 시각이 붙으며 순서는 그대로다", async () => {
    const old = await write("첫째", "원래", "1234", at(0));
    await write("둘째", "다음", "1234", at(1));
    expect(await editEntry(db, { id: old, message: "고침", password: "1234" }, at(5))).toEqual({ ok: true });
    const list = await listEntries(db);
    expect(list.map((e) => e.authorName)).toEqual(["둘째", "첫째"]);
    expect(list[1]).toMatchObject({ message: "고침", createdAt: at(0), updatedAt: at(5) });
  });

  it("비밀번호가 틀리면 거부하고 메시지는 바뀌지 않는다", async () => {
    const id = await write();
    expect(await editEntry(db, { id, message: "몰래", password: "0000" }, t0)).toMatchObject({
      ok: false,
      reason: "wrong_password",
    });
    expect((await listEntries(db))[0].message).toBe("안녕하세요");
  });

  it("없는 글이면 not_found", async () => {
    expect(await editEntry(db, { id: 999, message: "x", password: "1234" }, t0)).toMatchObject({ reason: "not_found" });
  });
});

describe("삭제", () => {
  it("올바른 비밀번호면 완전히 삭제된다", async () => {
    const id = await write();
    expect(await deleteEntry(db, { id, password: "1234" })).toEqual({ ok: true });
    expect(await listEntries(db)).toEqual([]);
  });

  it("비밀번호가 틀리면 거부하고 글은 남는다", async () => {
    const id = await write();
    expect(await deleteEntry(db, { id, password: "9999" })).toMatchObject({ reason: "wrong_password" });
    expect(await listEntries(db)).toHaveLength(1);
  });

  it("이미 삭제된 글이면 not_found", async () => {
    const id = await write();
    await deleteEntry(db, { id, password: "1234" });
    expect(await deleteEntry(db, { id, password: "1234" })).toMatchObject({ reason: "not_found" });
  });
});
