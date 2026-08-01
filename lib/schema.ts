import { z } from "zod";
export const generateSchema = z.object({
  title: z.string().min(1).max(100),
  notes: z.string().min(20).max(8000),
  photos: z.array(z.string()).max(24),
  narrationUrl: z.string().optional(),
  format: z.enum(["vertical", "horizontal"]).optional().default("vertical"),
});
