import { describe, expect, it } from "vitest";
import {
  assertModelPricingMap,
  assertTextResponse,
  ModelPricingMap,
  TextResponse,
} from "../schema-guards";

describe("assertModelPricingMap", () => {
  it("returns the original map when entries are valid", () => {
    const payload: ModelPricingMap = {
      "gpt-5-mini": { input: 0.2, output: 0.8 },
      "gpt-4": { input: 30, output: 60 },
    };

    const result = assertModelPricingMap(payload);
    expect(result).toBe(payload);
  });

  it("throws when payload is not an object map", () => {
    expect(() => assertModelPricingMap(null)).toThrow(/must be an object map/);
    expect(() => assertModelPricingMap([])).toThrow(/must be an object map/);
  });

  it("throws when entries lack numeric input or output", () => {
    const badPayload = {
      model: { input: "cheap", output: 1 },
    } as unknown;

    expect(() => assertModelPricingMap(badPayload)).toThrow(/Invalid pricing entry/);
  });
});

describe("assertTextResponse", () => {
  const baseResponse: TextResponse = {
    output: [
      {
        content: [{ type: "output_text", text: "Hello" }],
      },
    ],
    usage: {
      input_tokens: 100,
      output_tokens: 20,
      total_tokens: 120,
    },
  };

  it("returns the response when shape is valid", () => {
    const result = assertTextResponse(baseResponse);
    expect(result).toEqual(baseResponse);
  });

  it("throws when payload is missing", () => {
    expect(() => assertTextResponse(null)).toThrow(/missing or malformed/);
  });

  it("throws when output is not an array", () => {
    const badResponse = { ...baseResponse, output: "oops" } as unknown;
    expect(() => assertTextResponse(badResponse)).toThrow(/output must be an array/);
  });

  it("throws when a content entry is not an array", () => {
    const badResponse = {
      ...baseResponse,
      output: [{ content: "oops" }],
    } as unknown;

    expect(() => assertTextResponse(badResponse)).toThrow(/content must be an array/);
  });

  it("throws when usage is not an object", () => {
    const badResponse = { ...baseResponse, usage: 10 } as unknown;
    expect(() => assertTextResponse(badResponse)).toThrow(/usage must be an object/);
  });

  it("throws when token counts are non-numeric", () => {
    const badResponse = {
      ...baseResponse,
      usage: { input_tokens: "a lot" },
    } as unknown;

    expect(() => assertTextResponse(badResponse)).toThrow(/must be a number/);
  });
});
