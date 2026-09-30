/** 입력 길이 제한 (앞뒤 공백 제거 후). 클라이언트와 서버가 함께 쓴다. */
export const LIMITS = {
  authorName: { min: 1, max: 20 },
  message: { min: 1, max: 500 },
  password: { min: 4, max: 20 },
} as const;
