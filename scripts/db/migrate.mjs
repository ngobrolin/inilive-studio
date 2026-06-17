import { createDatabase } from "../../src/lib/server/db/database.ts";
import { migrateDatabase } from "../../src/lib/server/db/migrations.ts";

const db = createDatabase();

try {
  await migrateDatabase(db);
  console.log("Database migrations applied.");
} finally {
  await db.destroy();
}
