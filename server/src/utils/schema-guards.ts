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

export function assertModelPricingMap(data: unknown): ModelPricingMap {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error("LLM pricing configuration must be an object map");
  }

  for (const [model, entry] of Object.entries(data)) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      Array.isArray(entry) ||
      !isFiniteNumber((entry as Partial<ModelPricingEntry>).input) ||
      !isFiniteNumber((entry as Partial<ModelPricingEntry>).output)
    ) {
      throw new Error(`Invalid pricing entry for model '${model}'`);
    }
  }

  return data as ModelPricingMap;
}

export function assertTextResponse(payload: unknown): TextResponse {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("OpenAI response payload is missing or malformed");
  }

  const response = payload as TextResponse;

  if (response.output && !Array.isArray(response.output)) {
    throw new Error("OpenAI response output must be an array when present");
  }

  response.output?.forEach((segment, index) => {
    if (segment.content && !Array.isArray(segment.content)) {
      throw new Error(
        `OpenAI response output[${index}].content must be an array when present`
      );
    }
  });

  if (response.usage && typeof response.usage !== "object") {
    throw new Error("OpenAI response usage must be an object when present");
  }

  const tokenFields: Array<keyof NonNullable<TextResponse["usage"]>> = [
    "input_tokens",
    "output_tokens",
    "total_tokens",
  ];

  tokenFields.forEach((field) => {
    const value = response.usage?.[field];
    if (value !== undefined && !isFiniteNumber(value)) {
      throw new Error(`OpenAI response usage.${field} must be a number when present`);
    }
  });

  return response;
}
