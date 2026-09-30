# 미니 방명록 (guestbook-202304248)

회원가입 없이 이름·메시지·비밀번호로 글을 남기고, 글을 쓸 때 정한 비밀번호로 본인 글만 수정·삭제할 수 있는 방명록입니다.

- **배포 URL**: https://guestbook-202304248.vercel.app
- **개발자**: 안한석 (202304248)

## 기능

| 기능 | 설명 |
|---|---|
| 작성 | 이름(1~20자), 메시지(1~500자), 비밀번호(4~20자)로 새 글 작성. 잘못된 입력은 칸 아래에 사유 표시 |
| 조회 | 전체 글을 **최신 작성 순**으로 표시. 작성 시각은 한국 시간 `YYYY-MM-DD HH:mm` |
| 수정 | 비밀번호가 맞으면 메시지 수정, `(수정됨)` 표시. 틀리면 거부하고 안내 |
| 삭제 | 비밀번호가 맞으면 삭제. 틀리면 거부하고 안내 |
| 잠금 | 한 글에 비밀번호를 연속 10회 틀리면 5분간 수정·삭제 잠금 (무차별 대입 방지) |

비밀번호는 bcrypt 해시로만 저장하며, 비교는 서버에서만 합니다.

## 기술 스택

- Next.js (App Router) + TypeScript, Tailwind CSS
- Neon Postgres + Drizzle ORM
- Vercel 배포
- Vitest + PGlite (인메모리 Postgres) 테스트

## 로컬 실행

```bash
npm install
echo 'DATABASE_URL="<Neon 연결 문자열>"' > .env
npm run db:migrate   # 테이블 생성
npm run dev          # http://localhost:3000
npm test             # 방명록 규칙 테스트
```

## 구조

```
src/
  app/page.tsx          # 방명록 페이지 (목록 + 작성 폼 + 푸터)
  app/actions.ts        # Server Actions: 작성·수정·삭제 요청 처리
  components/           # 작성 폼, 글 카드(인라인 수정·삭제)
  lib/guestbook.ts      # 핵심 규칙: 입력 검증, 비밀번호 확인, 잠금, 정렬
  db/schema.ts          # entries 테이블
drizzle/                # 마이그레이션 SQL
docs/                   # spec, 결정 기록(ADR)
```

## 개발 과정

Claude Code + Matt Pocock's Skills: `/grill-with-docs` → `/to-spec` → `/to-tickets` → `/implement` → `/code-review`

- 용어 사전: [CONTEXT.md](CONTEXT.md)
- 요구사항 명세: [docs/spec.md](docs/spec.md) (Issue #1), 구현 티켓 Issue #2~#4
