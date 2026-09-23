import { z } from "zod";
import type { IndicatorEvidence, IndicatorKey, ZoneKey } from "./types";
import { ZONE_INDICATORS } from "./labels";

const stateSchema = z.enum([
  "present",
  "absent",
  "unknown",
  "not_visible",
  "not_documented",
  "conflicting",
  "not_applicable",
]);

const observationSchema = z.object({
  indicator_code: z.string(),
  state: stateSchema,
  explanation_ar: z.string().min(1),
  explanation_en: z.string().min(1),
});

const responseSchema = z.object({
  observations: z.array(observationSchema),
});

type GeminiInput = {
  zone: ZoneKey;
  images: Array<{ mimeType: string; base64: string }>;
};

function extractJson(text: string): unknown {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned);
}

/**
 * Server-only Gemini adapter. Never import this module from a client component.
 * It is intentionally constrained to observable physical-access evidence and
 * must not infer measurements, legal compliance, certification, or whole-building accessibility.
 */
export async function analyseEvidenceWithGemini({ zone, images }: GeminiInput): Promise<IndicatorEvidence[]> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) throw new Error("GEMINI_NOT_CONFIGURED");

  if (images.length === 0 || images.length > 6) {
    throw new Error("INVALID_IMAGE_COUNT");
  }

  const model = process.env["GEMINI_MODEL"] || "gemini-3.6-flash";
  const allowed = ZONE_INDICATORS[zone];
  const prompt = [
    "You are the MUTAH MAP visual evidence observer.",
    "Observe only what is visibly supported by the provided image bundle.",
    "Do not certify accessibility, legal compliance, safety, dimensions, slope, or whole-building accessibility.",
    "Not visible is not absent. If the frame cannot establish absence, use not_visible or unknown.",
    `Zone: ${zone}`,
    `Allowed indicator codes only: ${allowed.join(", ")}`,
    "Return JSON only with this shape:",
    '{"observations":[{"indicator_code":"...","state":"present|absent|unknown|not_visible|not_applicable","explanation_ar":"...","explanation_en":"..."}]}',
    "Use concise human-readable explanations. Include every allowed indicator exactly once.",
  ].join("\n");

  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  for (const image of images) {
    parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const responseText = await response.text();
    console.error("[MUTAH AI] Gemini request failed", {
      status: response.status,
      model,
      zone,
      imageCount: images.length,
      mimeTypes: images.map((image) => image.mimeType),
      response: responseText.slice(0, 1200),
    });
    throw new Error(`GEMINI_HTTP_${response.status}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  const parsed = responseSchema.parse(extractJson(text));

  const byCode = new Map(parsed.observations.map((item) => [item.indicator_code, item]));
  return allowed.map((key: IndicatorKey) => {
    const item = byCode.get(key);
    if (!item) {
      return {
        key,
        state: "unknown",
        note: {
          ar: "لم يُرجع التحليل دليلًا كافيًا لهذا العنصر.",
          en: "The analysis did not return sufficient evidence for this feature.",
        },
      };
    }
    return {
      key,
      state: item.state,
      note: { ar: item.explanation_ar, en: item.explanation_en },
    };
  });
}
