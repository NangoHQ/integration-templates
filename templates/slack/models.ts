import { z } from "zod";

export const SlackUser = z.object({
  id: z.string(),
  team_id: z.string(),
  name: z.string(),
  deleted: z.boolean(),
  tz: z.string(),
  tz_label: z.string(),
  tz_offset: z.number(),

  profile: z.object({
    avatar_hash: z.string(),
    real_name: z.union([z.string(), z.null()]),
    display_name: z.union([z.string(), z.null()]),
    real_name_normalized: z.union([z.string(), z.null()]),
    display_name_normalized: z.union([z.string(), z.null()]),
    email: z.union([z.string(), z.null()]),
    image_original: z.union([z.string(), z.null()]).optional()
  }),

  is_admin: z.boolean(),
  is_owner: z.boolean(),
  is_primary_owner: z.boolean(),
  is_restricted: z.boolean(),
  is_ultra_restricted: z.boolean(),
  is_bot: z.boolean(),
  updated: z.number(),
  is_app_user: z.boolean(),
  raw_json: z.string()
});

export type SlackUser = z.infer<typeof SlackUser>;

export const SlackChannel = z.object({
  id: z.string(),
  name: z.string(),
  is_channel: z.boolean(),
  is_group: z.boolean(),
  is_im: z.boolean(),
  created: z.number(),
  creator: z.string(),
  is_archived: z.boolean(),
  is_general: z.boolean(),
  name_normalized: z.string(),
  is_shared: z.boolean(),
  is_private: z.boolean(),
  is_mpim: z.boolean(),
  updated: z.number(),
  num_members: z.number(),
  raw_json: z.string()
});

export type SlackChannel = z.infer<typeof SlackChannel>;

export const SlackMessage = z.object({
  id: z.string(),
  ts: z.string(),
  channel_id: z.string(),
  thread_ts: z.union([z.string(), z.null()]),
  app_id: z.union([z.string(), z.null()]),
  bot_id: z.union([z.string(), z.null()]),
  display_as_bot: z.union([z.boolean(), z.null()]),
  is_locked: z.union([z.boolean(), z.null()]),

  metadata: z.object({
    event_type: z.string()
  }),

  parent_user_id: z.union([z.string(), z.null()]),
  subtype: z.union([z.string(), z.null()]),
  text: z.union([z.string(), z.null()]),
  topic: z.union([z.string(), z.null()]),
  user_id: z.union([z.string(), z.null()]),
  raw_json: z.string()
});

export type SlackMessage = z.infer<typeof SlackMessage>;

export const SlackMessageReply = z.object({
  id: z.string(),
  ts: z.string(),
  channel_id: z.string(),
  thread_ts: z.union([z.string(), z.null()]),
  app_id: z.union([z.string(), z.null()]),
  bot_id: z.union([z.string(), z.null()]),
  display_as_bot: z.union([z.boolean(), z.null()]),
  is_locked: z.union([z.boolean(), z.null()]),

  metadata: z.object({
    event_type: z.string()
  }),

  parent_user_id: z.union([z.string(), z.null()]),
  subtype: z.union([z.string(), z.null()]),
  text: z.union([z.string(), z.null()]),
  topic: z.union([z.string(), z.null()]),
  user_id: z.union([z.string(), z.null()]),

  root: z.object({
    message_id: z.union([z.string(), z.null()]),
    ts: z.string()
  }),

  raw_json: z.string()
});

export type SlackMessageReply = z.infer<typeof SlackMessageReply>;

export const SlackMessageReaction = z.object({
  id: z.string(),
  message_ts: z.string(),
  thread_ts: z.string(),
  channel_id: z.string(),
  user_id: z.string(),
  reaction_name: z.string()
});

export type SlackMessageReaction = z.infer<typeof SlackMessageReaction>;

export const SendMessageInput = z.object({
  channel: z.string(),
  text: z.string()
});

export type SendMessageInput = z.infer<typeof SendMessageInput>;

export const SendMessageOutput = z.object({
  ok: z.boolean(),
  channel: z.string().optional(),
  ts: z.string().optional(),
  message: z.string().optional(),
  warning: z.string().optional(),
  error: z.string().optional(),
  raw_json: z.string()
});

export type SendMessageOutput = z.infer<typeof SendMessageOutput>;

export const SlackMessageMetadata = z.object({
    channelsLastSyncDate: z.record(z.string(), z.string()).optional()
});

export type SlackMessageMetadata = z.infer<typeof SlackMessageMetadata>;

export const models = {
  SlackUser: SlackUser,
  SlackChannel: SlackChannel,
  SlackMessage: SlackMessage,
  SlackMessageReply: SlackMessageReply,
  SlackMessageReaction: SlackMessageReaction,
  SendMessageInput: SendMessageInput,
  SendMessageOutput: SendMessageOutput
};
