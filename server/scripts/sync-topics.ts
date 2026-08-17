import { createClient } from "@libsql/client";
import { config } from "../src/config";
import { createLogger } from "../src/utils/logger";

const log = createLogger("scripts/sync-topics");

const topics = config.topics;
if (!Array.isArray(topics)) {
  log.error("No topics configured to sync.");
  process.exit(1);
}

const db = createClient({
  url: config.database.url,
  authToken: config.database.authToken,
});

async function main() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      keywords TEXT NOT NULL,
      sources TEXT NOT NULL,
      active INTEGER DEFAULT 1
    );
  `);

  let inserted = 0;
  let updated = 0;

  for (const topic of topics) {
    if (!topic?.name) {
      continue;
    }

    const keywords = JSON.stringify(topic.keywords ?? []);
    const sources = JSON.stringify(topic.sources ?? {});
    const active = topic.active ?? 1;

    const existing = await db.execute({
      sql: "SELECT id FROM topics WHERE name = ?",
      args: [topic.name],
    });

    if (existing.rows.length > 0) {
      await db.execute({
        sql: "UPDATE topics SET keywords = ?, sources = ?, active = ? WHERE name = ?",
        args: [keywords, sources, active, topic.name],
      });
      updated += 1;
    } else {
      await db.execute({
        sql: "INSERT INTO topics (name, keywords, sources, active) VALUES (?, ?, ?, ?)",
        args: [topic.name, keywords, sources, active],
      });
      inserted += 1;
    }
  }

  log.info({ inserted, updated }, "Topics synced");
}

main()
  .catch((error) => {
    log.error({ err: error }, "Failed to sync topics");
    process.exitCode = 1;
  })
  .finally(() => {
    db.close();
  });
