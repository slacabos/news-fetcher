import Database from "better-sqlite3";
import { config } from "../src/config";
import { createLogger } from "../src/utils/logger";

const log = createLogger("scripts/sync-topics");

const topics = config.topics;
if (!Array.isArray(topics)) {
  log.error("No topics configured to sync.");
  process.exit(1);
}

const db = new Database(config.database.path);

db.exec(`
  CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    keywords TEXT NOT NULL,
    sources TEXT NOT NULL,
    active INTEGER DEFAULT 1
  );
`);

const selectStmt = db.prepare("SELECT id FROM topics WHERE name = ?");
const insertStmt = db.prepare(
  "INSERT INTO topics (name, keywords, sources, active) VALUES (?, ?, ?, ?)"
);
const updateStmt = db.prepare(
  "UPDATE topics SET keywords = ?, sources = ?, active = ? WHERE name = ?"
);

const { inserted, updated } = db.transaction(() => {
  let insertedCount = 0;
  let updatedCount = 0;

  for (const topic of topics) {
    if (!topic?.name) {
      continue;
    }

    const keywords = JSON.stringify(topic.keywords ?? []);
    const sources = JSON.stringify(topic.sources ?? {});
    const active = topic.active ?? 1;

    const existing = selectStmt.get(topic.name) as { id: number } | undefined;
    if (existing) {
      updateStmt.run(keywords, sources, active, topic.name);
      updatedCount += 1;
    } else {
      insertStmt.run(topic.name, keywords, sources, active);
      insertedCount += 1;
    }
  }

  return { inserted: insertedCount, updated: updatedCount };
})();

db.close();

log.info(
  { inserted, updated, dbPath: config.database.path },
  "Topics synced"
);
