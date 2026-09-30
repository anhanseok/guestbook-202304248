import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { createEntry, deleteEntry, editEntry, listEntries, MAX_ATTEMPTS } from "./guestbook";
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
    expect(await deleteEntry(db, { id, password: "1234" }, t0)).toEqual({ ok: true });
    expect(await listEntries(db)).toEqual([]);
  });

  it("비밀번호가 틀리면 거부하고 글은 남는다", async () => {
    const id = await write();
    expect(await deleteEntry(db, { id, password: "9999" }, t0)).toMatchObject({ reason: "wrong_password" });
    expect(await listEntries(db)).toHaveLength(1);
  });

  it("이미 삭제된 글이면 not_found", async () => {
    const id = await write();
    await deleteEntry(db, { id, password: "1234" }, t0);
    expect(await deleteEntry(db, { id, password: "1234" }, t0)).toMatchObject({ reason: "not_found" });
  });
});

describe("잠금", () => {
  const wrongEdit = (id: number, now = t0) => editEntry(db, { id, message: "x", password: "0000" }, now);

  it("틀릴 때마다 남은 시도 횟수가 줄고, 10번째에 5분간 잠긴다", async () => {
    const id = await write();
    for (let remaining = MAX_ATTEMPTS - 1; remaining >= 1; remaining--) {
      expect(await wrongEdit(id)).toMatchObject({ reason: "wrong_password", remainingAttempts: remaining });
    }
    expect(await wrongEdit(id)).toMatchObject({ reason: "locked", retryAfterMinutes: 5 });
  });

  it("잠긴 동안에는 올바른 비밀번호도 거부하고, 남은 시간을 분 단위 올림으로 알려준다", async () => {
    const id = await write();
    for (let i = 0; i < MAX_ATTEMPTS; i++) await wrongEdit(id);
    expect(await deleteEntry(db, { id, password: "1234" }, at(2.5))).toMatchObject({
      reason: "locked",
      retryAfterMinutes: 3,
    });
    expect(await listEntries(db)).toHaveLength(1);
  });

  it("5분이 지나면 올바른 비밀번호가 통하고, 틀리면 다시 1회째부터 센다", async () => {
    const id = await write();
    for (let i = 0; i < MAX_ATTEMPTS; i++) await wrongEdit(id);
    expect(await wrongEdit(id, at(5))).toMatchObject({ reason: "wrong_password", remainingAttempts: MAX_ATTEMPTS - 1 });
    expect(await editEntry(db, { id, message: "풀림", password: "1234" }, at(5))).toEqual({ ok: true });
  });

  it("비밀번호를 맞히면 실패 횟수가 초기화된다", async () => {
    const id = await write();
    for (let i = 0; i < 3; i++) await wrongEdit(id);
    await editEntry(db, { id, message: "성공", password: "1234" }, t0);
    expect(await wrongEdit(id)).toMatchObject({ remainingAttempts: MAX_ATTEMPTS - 1 });
  });

  it("수정과 삭제의 실패를 합쳐서 센다", async () => {
    const id = await write();
    await wrongEdit(id);
    expect(await deleteEntry(db, { id, password: "0000" }, t0)).toMatchObject({ remainingAttempts: MAX_ATTEMPTS - 2 });
  });

  it("한 글이 잠겨도 다른 글은 영향이 없다", async () => {
    const locked = await write("A");
    const other = await write("B");
    for (let i = 0; i < MAX_ATTEMPTS; i++) await wrongEdit(locked);
    expect(await deleteEntry(db, { id: other, password: "1234" }, t0)).toEqual({ ok: true });
  });
});
