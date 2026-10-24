import { createServerFn } from "@tanstack/react-start";
import { buildLesson } from "@/lib/ai-lesson.server";
import { lessonInputSchema, type LessonInput } from "./classroom-ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const generateAiLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: LessonInput) => lessonInputSchema.parse(data))
  .handler(async ({ data }) => {
    const config = {
      apiKey: process.env["GROQ_CLASSROOM_API_KEY"] || "",
      model: process.env["GROQ_CLASSROOM_MODEL"] || "",
      visionModel: process.env["GROQ_CLASSROOM_VISION_MODEL"] || "",
    };
    const { questions, ...lesson } = await buildLesson(config, data);
    return { lesson, questions };
  });
