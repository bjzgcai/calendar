import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/storage/database/shared/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://calendar_user:calendar_pass@localhost:5432/calendar",
  },
});
