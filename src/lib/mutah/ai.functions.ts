import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const zoneSchema = z.enum(["approach", "entrance", "parking", "elevator", "restroom"]);
const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const SUPABASE_URL =
  process.env["SUPABASE_URL"] ||
  process.env["VITE_SUPABASE_URL"] ||
  "https://lxwwdobvlysgqdgixniv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env["SUPABASE_PUBLISHABLE_KEY"] ||
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
  "sb_publishable_L-E_exDU3r8nhA5xz3gb4w_EzqgXiIv";

export const analyseEvidenceServer = createServerFn({ method: "POST" })
  .validator((input: FormData) => {
    if (!(input instanceof FormData)) throw new Error("INVALID_FORM_DATA");
    const zone = zoneSchema.parse(input.get("zone"));
    const accessToken = z.string().min(1).parse(input.get("accessToken"));
    const files = input.getAll("images").filter((item): item is File => item instanceof File);
    if (files.length === 0 || files.length > MAX_IMAGES) throw new Error("INVALID_IMAGE_COUNT");
    for (const file of files) {
      if (!file.type.startsWith("image/")) throw new Error("INVALID_IMAGE_TYPE");
      if (file.size > MAX_IMAGE_BYTES) throw new Error("IMAGE_TOO_LARGE");
    }
    return { zone, files, accessToken };
  })
  .handler(async ({ data }) => {
    const authClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(data.accessToken);
    if (authError || !authData.user) throw new Error("AUTH_REQUIRED");

    const { analyseEvidenceWithGemini } = await import("./gemini.server");
    const images = await Promise.all(
      data.files.map(async (file) => ({
        mimeType: file.type,
        base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
      })),
    );
    return analyseEvidenceWithGemini({ zone: data.zone, images });
  });
