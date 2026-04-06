import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { leadgenJob } from "@/lib/inngest/leadgen-job";
import {
  autoScoreNewLeads,
  autoEnrichNewLeads,
  todoistSync,
  followUpScheduler,
  weeklyPipelineDigest,
  weeklyRescore,
} from "@/lib/inngest/cron-jobs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    leadgenJob,
    autoScoreNewLeads,
    autoEnrichNewLeads,
    todoistSync,
    followUpScheduler,
    weeklyPipelineDigest,
    weeklyRescore,
  ],
});
