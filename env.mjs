import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    HUGGINGFACE_API_KEY: z.string().min(1),
    RATE_LIMIT_MAX: z.string().default("100"), // Max requests per minute
  },
  client: {},
  runtimeEnv: {
    HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY,
    RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX,
  },
});
