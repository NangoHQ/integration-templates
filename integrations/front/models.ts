import { z } from "zod";

export const ConversationAssignee = z.object({
  id: z.string(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  is_admin: z.boolean(),
  is_available: z.boolean(),
  is_blocked: z.boolean(),
  custom_fields: z.record(z.string(), z.any())
});

export type ConversationAssignee = z.infer<typeof ConversationAssignee>;

export const ConversationRecipient = z.object({
  name: z.string(),
  handle: z.string(),
  role: z.union([z.literal("from"), z.literal("to"), z.literal("cc"), z.literal("bcc")])
});

export type ConversationRecipient = z.infer<typeof ConversationRecipient>;

export const Conversation = z.object({
  id: z.string(),
  subject: z.string(),

  status: z.union([
    z.literal("archived"),
    z.literal("unassigned"),
    z.literal("deleted"),
    z.literal("assigned")
  ]),

  assignee: z.union([ConversationAssignee, z.null()]),
  recipient: z.union([ConversationRecipient, z.null()]),

  tags: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.union([z.string(), z.null()]),
    highlight: z.union([z.string(), z.null()]),
    is_private: z.boolean(),
    is_visible_in_conversation_lists: z.boolean(),
    created_at: z.string(),
    updated_at: z.string()
  })),

  links: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    external_url: z.string(),
    custom_fields: z.record(z.string(), z.any())
  })),

  custom_fields: z.record(z.string(), z.any()),
  created_at: z.string(),
  waiting_since: z.string(),
  is_private: z.boolean(),

  scheduled_reminders: z.array(z.object({
    created_at: z.string(),
    scheduled_at: z.string(),
    updated_at: z.string()
  }))
});

export type Conversation = z.infer<typeof Conversation>;

export const QueryParams = z.object({
  limit: z.number().optional(),
  page_token: z.string().optional(),
  sort_by: z.string().optional(),
  sort_order: z.union([z.literal("asc"), z.literal("desc")]).optional()
});

export type QueryParams = z.infer<typeof QueryParams>;

export const SingleConversation = z.object({
  id: z.string(),
  query: QueryParams
});

export type SingleConversation = z.infer<typeof SingleConversation>;

export const RecipientsObj = z.object({
  _links: z.object({
    related: z.object({
      contact: z.string()
    })
  }),

  name: z.string(),
  handle: z.string(),
  role: z.union([z.literal("from"), z.literal("to"), z.literal("cc"), z.literal("bcc")])
});

export type RecipientsObj = z.infer<typeof RecipientsObj>;

export const AttachmentObj = z.object({
  id: z.string(),
  filename: z.string(),
  url: z.string(),
  content_type: z.string(),
  size: z.number(),

  metadata: z.object({
    is_inline: z.boolean(),
    cid: z.string()
  })
});

export type AttachmentObj = z.infer<typeof AttachmentObj>;

export const AuthorObj = z.object({
  _links: z.object({
    self: z.string(),

    related: z.object({
      inboxes: z.string(),
      conversations: z.string()
    })
  }),

  id: z.string(),
  email: z.string(),
  username: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  is_admin: z.boolean(),
  is_blocked: z.boolean(),
  custom_fields: z.record(z.string(), z.any())
});

export type AuthorObj = z.infer<typeof AuthorObj>;

export const SignatureObj = z.object({
  _links: z.object({
    related: z.object({
      owner: z.string().optional()
    }).optional()
  }).optional(),

  id: z.string().optional(),
  name: z.string().optional(),
  body: z.string().optional(),
  sender_info: z.string().optional(),
  is_visible_for_all_teammate_channels: z.boolean().optional(),
  is_default: z.boolean().optional(),
  is_private: z.boolean().optional(),
  channel_ids: z.string().optional().array().optional()
});

export type SignatureObj = z.infer<typeof SignatureObj>;

export const FrontMessages = z.object({
  _links: z.object({
    self: z.string(),

    related: z.object({
      conversation: z.string(),
      message_replied_to: z.string().optional(),
      message_seen: z.string()
    })
  }),

  id: z.string(),
  version: z.union([z.string(), z.null()]).optional(),
  blurb: z.string(),
  error_type: z.union([z.string(), z.null()]),

  type: z.union([
    z.literal("call"),
    z.literal("custom"),
    z.literal("email"),
    z.literal("facebook"),
    z.literal("front_chat"),
    z.literal("googleplay"),
    z.literal("intercom"),
    z.literal("internal"),
    z.literal("phone-call"),
    z.literal("sms"),
    z.literal("tweet"),
    z.literal("tweet_dm"),
    z.literal("whatsapp"),
    z.literal("yalo_wha")
  ]),

  is_draft: z.boolean(),
  is_inbound: z.boolean(),
  draft_mode: z.union([z.string(), z.null()]),
  created_at: z.number(),
  subject: z.string(),
  author: z.union([AuthorObj, z.null()]),
  recipients: RecipientsObj.array(),
  body: z.string(),
  text: z.string(),
  attachments: AttachmentObj.array().optional(),
  signature: z.union([SignatureObj, z.null()]).optional(),

  metadata: z.object({
    intercom_url: z.string().optional(),
    duration: z.number().optional(),
    have_been_answered: z.boolean().optional(),
    external_id: z.string().optional(),
    twitter_url: z.string().optional(),
    is_retweet: z.boolean().optional(),
    have_been_retweeted: z.boolean().optional(),
    have_been_favorited: z.boolean().optional(),
    thread_ref: z.string().optional(),
    headers: z.record(z.string(), z.any()).optional(),
    chat_visitor_url: z.string().optional()
  }).optional()
});

export type FrontMessages = z.infer<typeof FrontMessages>;

export const FrontMessageOutput = z.object({
  messages: FrontMessages.array()
});

export type FrontMessageOutput = z.infer<typeof FrontMessageOutput>;

export const models = {
  ConversationAssignee: ConversationAssignee,
  ConversationRecipient: ConversationRecipient,
  Conversation: Conversation,
  QueryParams: QueryParams,
  SingleConversation: SingleConversation,
  RecipientsObj: RecipientsObj,
  AttachmentObj: AttachmentObj,
  AuthorObj: AuthorObj,
  SignatureObj: SignatureObj,
  FrontMessages: FrontMessages,
  FrontMessageOutput: FrontMessageOutput
};
