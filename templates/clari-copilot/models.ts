import { z } from "zod";

export const ClariCopilotCall = z.object({
  id: z.string(),
  source_id: z.string(),
  title: z.string(),
  users: z.any().array(),
  externalParticipants: z.any().array(),
  status: z.string(),
  bot_not_join_reason: z.string().array(),
  type: z.string(),
  time: z.string(),
  icaluid: z.string(),
  calendar_id: z.string(),
  recurring_event_id: z.string(),
  original_start_time: z.string(),
  last_modified_time: z.string(),
  audio_url: z.string(),
  video_url: z.string(),
  disposition: z.string(),
  deal_name: z.string(),
  deal_value: z.string(),
  deal_close_date: z.string(),
  deal_stage_before_call: z.string(),
  account_name: z.string(),
  contact_names: z.string().array(),

  crm_info: z.object({
    source_crm: z.string(),
    deal_id: z.string(),
    account_id: z.string(),
    contact_ids: z.string().array()
  }),

  bookmark_timestamps: z.string().array(),

  metrics: z.object({
    talk_listen_ratio: z.number(),
    num_questions_asked: z.number(),
    num_questions_asked_by_reps: z.number(),
    call_duration: z.number(),
    total_speak_duration: z.number(),
    longest_monologue_duration: z.number(),
    longest_monologue_start_time: z.number(),
    engaging_questions: z.number(),
    categories: z.string().array()
  }),

  call_review_page_url: z.string(),
  deal_stage_live: z.string(),
  transcript: z.string().array(),

  summary: z.object({
    full_summary: z.string(),
    topics_discussed: z.string().array(),
    key_action_items: z.string().array()
  }),

  competitor_sentiments: z.string().array()
});

export type ClariCopilotCall = z.infer<typeof ClariCopilotCall>;

export const models = {
  ClariCopilotCall: ClariCopilotCall
};