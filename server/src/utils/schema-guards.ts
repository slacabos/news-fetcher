export type ModelPricingEntry = { input: number; output: number };
export type ModelPricingMap = Record<string, ModelPricingEntry>;

export type TextResponse = {
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function assertModelPricingMapShape(
  data: unknown
): asserts data is ModelPricingMap {
  if (!isRecord(data) || Array.isArray(data)) {
    throw new Error("LLM pricing configuration must be an object map");
  }

  for (const [model, entry] of Object.entries(data)) {
    if (!isRecord(entry) || Array.isArray(entry)) {
      throw new Error(`Invalid pricing entry for model '${model}'`);
    }

    const input = entry.input;
    const output = entry.output;

    if (!isFiniteNumber(input) || !isFiniteNumber(output)) {
      throw new Error(`Invalid pricing entry for model '${model}'`);
    }
  }
}

function assertTextResponseShape(
  payload: unknown
): asserts payload is TextResponse {
  if (!isRecord(payload)) {
    throw new Error("OpenAI response payload is missing or malformed");
  }

  const output = payload.output;
  if (output !== undefined && !Array.isArray(output)) {
    throw new Error("OpenAI response output must be an array when present");
  }

  if (Array.isArray(output)) {
    output.forEach((segment, index) => {
      if (!isRecord(segment)) {
        throw new Error(
          `OpenAI response output[${index}] must be an object when present`
        );
      }

      const content = segment.content;
      if (content !== undefined && !Array.isArray(content)) {
        throw new Error(
          `OpenAI response output[${index}].content must be an array when present`
        );
      }
    });
  }

  const usage = payload.usage;
  if (usage !== undefined && !isRecord(usage)) {
    throw new Error("OpenAI response usage must be an object when present");
  }

  const tokenFields: Array<keyof NonNullable<TextResponse["usage"]>> = [
    "input_tokens",
    "output_tokens",
    "total_tokens",
  ];

  tokenFields.forEach((field) => {
    const value = usage?.[field];
    if (value !== undefined && !isFiniteNumber(value)) {
      throw new Error(`OpenAI response usage.${field} must be a number when present`);
    }
  });
}

export function assertModelPricingMap(data: unknown): ModelPricingMap {
  assertModelPricingMapShape(data);
  return data;
}

export function assertTextResponse(payload: unknown): TextResponse {
  assertTextResponseShape(payload);
  return payload;
}
