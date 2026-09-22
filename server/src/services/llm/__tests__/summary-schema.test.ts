import { describe, expect, it } from "vitest";
import {
  MAX_DETAILS,
  MAX_HIGHLIGHTS,
  parseStructuredSummary,
  renderSummaryMarkdown,
  StructuredSummary,
} from "../summary-schema";

const sample: StructuredSummary = {
  overview: "Model launches dominated the day.",
  highlights: [
    { name: "Anthropic", text: "Released a new model." },
    { name: "OpenAI", text: "Announced two new models." },
  ],
  details: [
    { title: "New Claude model", text: "Anthropic announced a model.", score: 912 },
    { title: "GPT-6 release", text: "OpenAI announced two models.", score: 841 },
  ],
  alsoNoted: "Smaller posts covered agent tooling.",
};

describe("parseStructuredSummary", () => {
  it("parses valid JSON and trims whitespace", () => {
    const parsed = parseStructuredSummary(
      JSON.stringify({ ...sample, overview: "  Model launches dominated the day.  " })
    );
    expect(parsed).toEqual(sample);
  });

  it("caps highlights and details", () => {
    const many = {
      ...sample,
      highlights: Array.from({ length: 8 }, (_, i) => ({ name: `H${i}`, text: "t" })),
      details: Array.from({ length: 15 }, (_, i) => ({ title: `D${i}`, text: "t", score: i })),
    };
    const parsed = parseStructuredSummary(JSON.stringify(many));
    expect(parsed.highlights).toHaveLength(MAX_HIGHLIGHTS);
    expect(parsed.details).toHaveLength(MAX_DETAILS);
    expect(parsed.details[0].title).toBe("D0");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseStructuredSummary("## Summary\nnot json")).toThrow(/not valid JSON/);
  });

  it("throws on truncated JSON", () => {
    const full = JSON.stringify(sample);
    expect(() => parseStructuredSummary(full.slice(0, full.length - 20))).toThrow(
      /not valid JSON/
    );
  });

  it("throws when there are no highlights", () => {
    expect(() =>
      parseStructuredSummary(JSON.stringify({ ...sample, highlights: [] }))
    ).toThrow(/no highlights/);
  });

  it("throws when a required field is missing or has the wrong type", () => {
    const missing: Partial<StructuredSummary> = { ...sample };
    delete missing.alsoNoted;
    expect(() => parseStructuredSummary(JSON.stringify(missing))).toThrow(/alsoNoted/);
    expect(() =>
      parseStructuredSummary(
        JSON.stringify({ ...sample, details: [{ title: "x", text: "y", score: "high" }] })
      )
    ).toThrow(/score/);
  });
});

describe("renderSummaryMarkdown", () => {
  it("renders the Summary and Details sections", () => {
    expect(renderSummaryMarkdown(sample)).toBe(
      [
        "## Summary",
        "Model launches dominated the day.",
        "",
        "- **Anthropic**: Released a new model.",
        "- **OpenAI**: Announced two new models.",
        "",
        "## Details",
        "- **New Claude model** (score 912): Anthropic announced a model.",
        "- **GPT-6 release** (score 841): OpenAI announced two models.",
        "- **Also noted**: Smaller posts covered agent tooling.",
      ].join("\n")
    );
  });

  it("omits the Also noted bullet when empty", () => {
    const markdown = renderSummaryMarkdown({ ...sample, alsoNoted: "" });
    expect(markdown).not.toContain("Also noted");
  });
});
