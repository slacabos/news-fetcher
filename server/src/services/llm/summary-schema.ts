/**
 * Structured summary format shared by all LLM providers.
 * Providers ask the model for JSON matching SUMMARY_JSON_SCHEMA, then
 * render it to the markdown layout the frontend and Slack expect.
 */

export const MAX_HIGHLIGHTS = 5;
export const MAX_DETAILS = 10;

export const SUMMARY_JSON_SCHEMA = {
  type: "object",
  properties: {
    overview: { type: "string" },
    highlights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          text: { type: "string" },
        },
        required: ["name", "text"],
        additionalProperties: false,
      },
    },
    details: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          text: { type: "string" },
          score: { type: "integer" },
        },
        required: ["title", "text", "score"],
        additionalProperties: false,
      },
    },
    alsoNoted: { type: "string" },
  },
  required: ["overview", "highlights", "details", "alsoNoted"],
  additionalProperties: false,
};

export type StructuredSummary = {
  overview: string;
  highlights: Array<{ name: string; text: string }>;
  details: Array<{ title: string; text: string; score: number }>;
  alsoNoted: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const requireString = (value: unknown, field: string): string => {
  if (typeof value !== "string") {
    throw new Error(`Structured summary field '${field}' must be a string`);
  }
  return value.trim();
};

const requireArray = (value: unknown, field: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new Error(`Structured summary field '${field}' must be an array`);
  }
  return value;
};

/**
 * Parse and validate the raw model output. Throws on invalid or
 * truncated JSON so callers can treat it as a failed generation.
 */
export function parseStructuredSummary(raw: string): StructuredSummary {
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error("Structured summary is not valid JSON (possibly truncated)");
  }

  if (!isRecord(payload)) {
    throw new Error("Structured summary must be a JSON object");
  }

  const highlights = requireArray(payload.highlights, "highlights").map(
    (item, index) => {
      if (!isRecord(item)) {
        throw new Error(`Structured summary highlight ${index} must be an object`);
      }
      return {
        name: requireString(item.name, `highlights[${index}].name`),
        text: requireString(item.text, `highlights[${index}].text`),
      };
    }
  );

  const details = requireArray(payload.details, "details").map(
    (item, index) => {
      if (!isRecord(item)) {
        throw new Error(`Structured summary detail ${index} must be an object`);
      }
      const score = item.score;
      if (typeof score !== "number" || !Number.isFinite(score)) {
        throw new Error(
          `Structured summary field 'details[${index}].score' must be a number`
        );
      }
      return {
        title: requireString(item.title, `details[${index}].title`),
        text: requireString(item.text, `details[${index}].text`),
        score: Math.round(score),
      };
    }
  );

  return {
    overview: requireString(payload.overview, "overview"),
    highlights: highlights.slice(0, MAX_HIGHLIGHTS),
    details: details.slice(0, MAX_DETAILS),
    alsoNoted: requireString(payload.alsoNoted, "alsoNoted"),
  };
}

/**
 * Render a structured summary to the "## Summary" / "## Details" markdown
 * layout consumed by the frontend and the Slack formatter.
 */
export function renderSummaryMarkdown(summary: StructuredSummary): string {
  const lines: string[] = ["## Summary", summary.overview];

  if (summary.highlights.length > 0) {
    lines.push("");
  }
  for (const highlight of summary.highlights) {
    lines.push(`- **${highlight.name}**: ${highlight.text}`);
  }

  lines.push("", "## Details");

  for (const detail of summary.details) {
    lines.push(`- **${detail.title}** (score ${detail.score}): ${detail.text}`);
  }

  if (summary.alsoNoted) {
    lines.push(`- **Also noted**: ${summary.alsoNoted}`);
  }

  return lines.join("\n");
}
