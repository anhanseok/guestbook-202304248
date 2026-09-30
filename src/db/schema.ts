import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const entries = pgTable(
  "entries",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    authorName: text("author_name").notNull(),
    message: text().notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
  },
  (t) => [index("entries_created_at_idx").on(t.createdAt)],
);
