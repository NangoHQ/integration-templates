import { z } from "zod";

export const IdEntity = z.object({
  id: z.string()
});

export type IdEntity = z.infer<typeof IdEntity>;

export const SuccessResponse = z.object({
  success: z.boolean()
});

export type SuccessResponse = z.infer<typeof SuccessResponse>;

export const Contact = z.object({
  id: z.string(),
  workspace_id: z.string(),
  external_id: z.union([z.string(), z.null()]),
  type: z.string(),
  email: z.string(),
  phone: z.union([z.string(), z.null()]),
  name: z.union([z.string(), z.null()]),
  created_at: z.string(),
  updated_at: z.string(),
  last_seen_at: z.union([z.string(), z.null()]),
  last_replied_at: z.union([z.string(), z.null()])
});

export type Contact = z.infer<typeof Contact>;

export const Conversation = z.object({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  waiting_since: z.union([z.string(), z.null()]),
  snoozed_until: z.union([z.string(), z.null()]),
  title: z.union([z.string(), z.null()]),

  contacts: z.array(z.object({
    contact_id: z.string()
  })),

  state: z.string(),
  open: z.boolean(),
  read: z.boolean(),
  priority: z.string()
});

export type Conversation = z.infer<typeof Conversation>;

export const ConversationMessage = z.object({
  id: z.string(),
  conversation_id: z.string(),
  body: z.string(),
  type: z.string(),
  created_at: z.string(),
  updated_at: z.string(),

  author: z.object({
    type: z.string(),
    name: z.string(),
    id: z.string()
  })
});

export type ConversationMessage = z.infer<typeof ConversationMessage>;

export const ArticleContent = z.object({
  type: z.union([z.string(), z.null()]),
  title: z.string(),
  description: z.string(),
  body: z.string(),
  author_id: z.number(),
  state: z.string(),
  created_at: z.number(),
  updated_at: z.number(),
  url: z.string()
});

export type ArticleContent = z.infer<typeof ArticleContent>;

export const TranslatedContent = z.object({
  type: z.union([z.string(), z.null()]),
  ar: z.union([ArticleContent, z.null()]),
  bg: z.union([ArticleContent, z.null()]),
  bs: z.union([ArticleContent, z.null()]),
  ca: z.union([ArticleContent, z.null()]),
  cs: z.union([ArticleContent, z.null()]),
  da: z.union([ArticleContent, z.null()]),
  de: z.union([ArticleContent, z.null()]),
  el: z.union([ArticleContent, z.null()]),
  en: z.union([ArticleContent, z.null()]),
  es: z.union([ArticleContent, z.null()]),
  et: z.union([ArticleContent, z.null()]),
  fi: z.union([ArticleContent, z.null()]),
  fr: z.union([ArticleContent, z.null()]),
  he: z.union([ArticleContent, z.null()]),
  hr: z.union([ArticleContent, z.null()]),
  hu: z.union([ArticleContent, z.null()]),
  id: z.union([ArticleContent, z.null()]),
  it: z.union([ArticleContent, z.null()]),
  ja: z.union([ArticleContent, z.null()]),
  ko: z.union([ArticleContent, z.null()]),
  lt: z.union([ArticleContent, z.null()]),
  lv: z.union([ArticleContent, z.null()]),
  mn: z.union([ArticleContent, z.null()]),
  nb: z.union([ArticleContent, z.null()]),
  nl: z.union([ArticleContent, z.null()]),
  pl: z.union([ArticleContent, z.null()]),
  pt: z.union([ArticleContent, z.null()]),
  ro: z.union([ArticleContent, z.null()]),
  ru: z.union([ArticleContent, z.null()]),
  sl: z.union([ArticleContent, z.null()]),
  sr: z.union([ArticleContent, z.null()]),
  sv: z.union([ArticleContent, z.null()]),
  tr: z.union([ArticleContent, z.null()]),
  vi: z.union([ArticleContent, z.null()]),
  "pt-BR": z.union([ArticleContent, z.null()]),
  "zh-CN": z.union([ArticleContent, z.null()]),
  "zh-TW": z.union([ArticleContent, z.null()])
});

export type TranslatedContent = z.infer<typeof TranslatedContent>;

export const Article = z.object({
  type: z.string(),
  id: z.string(),
  workspace_id: z.string(),
  title: z.string(),
  description: z.union([z.string(), z.null()]),
  body: z.union([z.string(), z.null()]),
  author_id: z.number(),
  state: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  url: z.union([z.string(), z.null()]),
  parent_id: z.union([z.number(), z.null()]),
  parent_ids: z.number().array(),
  parent_type: z.union([z.string(), z.null()]),
  default_locale: z.string().optional(),
  translated_content: z.union([TranslatedContent, z.null()]).optional()
});

export type Article = z.infer<typeof Article>;

export const User = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string()
});

export type User = z.infer<typeof User>;

export const CreateContact = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string()
});

export type CreateContact = z.infer<typeof CreateContact>;

export const IntercomCreateContact = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  external_id: z.string().optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  signed_up_at: z.number().optional(),
  last_seen_at: z.number().optional(),
  owner_id: z.string().optional(),
  unsubscribed_from_emails: z.boolean().optional()
});

export type IntercomCreateContact = z.infer<typeof IntercomCreateContact>;

export const UserInformation = z.object({
  id: z.string(),
  email: z.string()
});

export type UserInformation = z.infer<typeof UserInformation>;

export const models = {
  IdEntity: IdEntity,
  SuccessResponse: SuccessResponse,
  Contact: Contact,
  Conversation: Conversation,
  ConversationMessage: ConversationMessage,
  ArticleContent: ArticleContent,
  TranslatedContent: TranslatedContent,
  Article: Article,
  User: User,
  CreateContact: CreateContact,
  IntercomCreateContact: IntercomCreateContact,
  UserInformation: UserInformation
};