import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { leadgenJob } from "@/lib/inngest/leadgen-job";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [leadgenJob],
});
