import { z } from "zod";

export const IdEntity = z.object({
  id: z.string()
});

export type IdEntity = z.infer<typeof IdEntity>;

export const SuccessResponse = z.object({
  success: z.boolean()
});

export type SuccessResponse = z.infer<typeof SuccessResponse>;

export const ActionResponseError = z.object({
  message: z.string()
});

export type ActionResponseError = z.infer<typeof ActionResponseError>;

export const User = z.object({
  id: z.number(),
  firstname: z.string(),
  lastname: z.string(),
  meta: z.union([z.object({}), z.null()])
});

export type User = z.infer<typeof User>;

export const AssigneeUser = z.object({
  id: z.number(),
  firstname: z.string(),
  lastname: z.string(),
  meta: z.union([z.object({}), z.null()]),
  email: z.string(),
  name: z.string(),
  bio: z.union([z.string(), z.null()])
});

export type AssigneeUser = z.infer<typeof AssigneeUser>;

export const RecieverSender = z.object({
  id: z.number(),
  firstname: z.string(),
  lastname: z.string(),
  meta: z.union([z.object({}), z.null()]),
  email: z.union([z.string(), z.null()]),
  name: z.union([z.string(), z.null()])
});

export type RecieverSender = z.infer<typeof RecieverSender>;

export const Attachment = z.object({
  url: z.string(),
  name: z.string(),
  size: z.union([z.number(), z.null()]),
  content_type: z.string(),
  "public": z.boolean(),
  extra: z.union([z.string(), z.null()])
});

export type Attachment = z.infer<typeof Attachment>;

export const Message = z.object({
  id: z.number(),
  uri: z.string(),
  message_id: z.union([z.string(), z.null()]),
  integration_id: z.union([z.number(), z.null()]),
  rule_id: z.union([z.number(), z.null()]),
  external_id: z.union([z.string(), z.null()]),
  ticket_id: z.number(),

  channel: z.union([
    z.literal("aircall"),
    z.literal("api"),
    z.literal("chat"),
    z.literal("contact_form"),
    z.literal("email"),
    z.literal("facebook"),
    z.literal("facebook-mention"),
    z.literal("facebook-messenger"),
    z.literal("facebook-recommendations"),
    z.literal("help-center"),
    z.literal("instagram-ad-comment"),
    z.literal("instagram-comment"),
    z.literal("instagram-direct-message"),
    z.literal("instagram-mention"),
    z.literal("internal-note"),
    z.literal("phone"),
    z.literal("sms"),
    z.literal("twitter"),
    z.literal("twitter-direct-message"),
    z.literal("whatsapp"),
    z.literal("yotpo-review"),
    z.string()
  ]),

  via: z.union([
    z.literal("aircall"),
    z.literal("api"),
    z.literal("chat"),
    z.literal("contact_form"),
    z.literal("email"),
    z.literal("facebook"),
    z.literal("facebook-mention"),
    z.literal("facebook-messenger"),
    z.literal("facebook-recommendations"),
    z.literal("form"),
    z.literal("gorgias_chat"),
    z.literal("help-center"),
    z.literal("helpdesk"),
    z.literal("instagram"),
    z.literal("instagram-ad-comment"),
    z.literal("instagram-comment"),
    z.literal("instagram-direct-message"),
    z.literal("instagram-mention"),
    z.literal("internal-note"),
    z.literal("offline_capture"),
    z.literal("phone"),
    z.literal("rule"),
    z.literal("self_service"),
    z.literal("shopify"),
    z.literal("sms"),
    z.literal("twilio"),
    z.literal("twitter"),
    z.literal("twitter-direct-message"),
    z.literal("whatsapp"),
    z.literal("yotpo"),
    z.literal("yotpo-review"),
    z.literal("zendesk")
  ]),

  subject: z.union([z.string(), z.null()]),
  body_text: z.union([z.string(), z.null()]),
  body_html: z.union([z.string(), z.null()]),
  stripped_text: z.union([z.string(), z.null()]),
  stripped_html: z.union([z.string(), z.null()]),
  stripped_signature: z.union([z.string(), z.null()]),
  "public": z.boolean(),
  from_agent: z.boolean(),
  sender: RecieverSender,
  receiver: z.union([RecieverSender, z.null()]),
  attachments: z.union([Attachment.array(), z.null()]),
  meta: z.union([z.object({}), z.null()]),
  headers: z.union([z.object({}), z.null()]),
  actions: z.union([z.any().array(), z.null()]),
  macros: z.union([z.any().array(), z.null()]),
  created_datetime: z.union([z.string(), z.null()]),
  opened_datetime: z.union([z.string(), z.null()]),
  failed_datetime: z.union([z.string(), z.null()]),
  last_sending_error: z.union([z.object({}), z.null()]),
  deleted_datetime: z.union([z.string(), z.null()]),
  replied_by: z.union([z.string(), z.null()]).optional(),
  replied_to: z.union([z.string(), z.null()]).optional()
});

export type Message = z.infer<typeof Message>;

export const Ticket = z.object({
  id: z.number(),
  assignee_user: z.union([AssigneeUser, z.null()]),

  channel: z.union([
    z.literal("aircall"),
    z.literal("api"),
    z.literal("chat"),
    z.literal("contact_form"),
    z.literal("email"),
    z.literal("facebook"),
    z.literal("facebook-mention"),
    z.literal("facebook-messenger"),
    z.literal("facebook-recommendations"),
    z.literal("help-center"),
    z.literal("instagram-ad-comment"),
    z.literal("instagram-comment"),
    z.literal("instagram-direct-message"),
    z.literal("instagram-mention"),
    z.literal("internal-note"),
    z.literal("phone"),
    z.literal("sms"),
    z.literal("twitter"),
    z.literal("twitter-direct-message"),
    z.literal("whatsapp"),
    z.literal("yotpo-review"),
    z.string()
  ]),

  closed_datetime: z.union([z.string(), z.null()]),
  created_datetime: z.union([z.string(), z.null()]),
  excerpt: z.string().optional(),
  external_id: z.union([z.string(), z.null()]),
  from_agent: z.boolean(),
  integrations: z.union([z.any().array(), z.null()]).optional(),
  is_unread: z.boolean(),
  language: z.union([z.string(), z.null()]),
  last_message_datetime: z.union([z.string(), z.null()]),
  last_received_message_datetime: z.union([z.string(), z.null()]),
  messages_count: z.number().optional(),
  messages: Message.array(),
  meta: z.union([z.object({}), z.null()]),
  opened_datetime: z.union([z.string(), z.null()]),
  snooze_datetime: z.union([z.string(), z.null()]),
  status: z.union([z.literal("open"), z.literal("closed")]),
  subject: z.union([z.string(), z.null()]),

  tags: z.array(z.object({
    id: z.number(),
    name: z.string(),
    uri: z.union([z.string(), z.null()]),
    decoration: z.union([z.object({}), z.null()]),
    created_datetime: z.union([z.string(), z.null()]),
    deleted_datetime: z.union([z.string(), z.null()]).optional()
  })),

  spam: z.union([z.boolean(), z.null()]),
  trashed_datetime: z.union([z.string(), z.null()]),
  updated_datetime: z.union([z.string(), z.null()]),

  via: z.union([
    z.literal("aircall"),
    z.literal("api"),
    z.literal("chat"),
    z.literal("contact_form"),
    z.literal("email"),
    z.literal("facebook"),
    z.literal("facebook-mention"),
    z.literal("facebook-messenger"),
    z.literal("facebook-recommendations"),
    z.literal("form"),
    z.literal("gorgias_chat"),
    z.literal("help-center"),
    z.literal("helpdesk"),
    z.literal("instagram"),
    z.literal("instagram-ad-comment"),
    z.literal("instagram-comment"),
    z.literal("instagram-direct-message"),
    z.literal("instagram-mention"),
    z.literal("internal-note"),
    z.literal("offline_capture"),
    z.literal("phone"),
    z.literal("rule"),
    z.literal("self_service"),
    z.literal("shopify"),
    z.literal("sms"),
    z.literal("twilio"),
    z.literal("twitter"),
    z.literal("twitter-direct-message"),
    z.literal("whatsapp"),
    z.literal("yotpo"),
    z.literal("yotpo-review"),
    z.literal("zendesk")
  ]),

  uri: z.string()
});

export type Ticket = z.infer<typeof Ticket>;

export const CreateTicketMessage = z.object({
  attachments: z.array(z.object({
    url: z.string(),
    name: z.string(),
    size: z.number(),
    content_type: z.string()
  })),

  body_html: z.string(),
  body_text: z.string(),
  id: z.string()
});

export type CreateTicketMessage = z.infer<typeof CreateTicketMessage>;

export const CreateTicketInput = z.object({
  customer: z.object({
    phone_number: z.string(),
    email: z.string().optional()
  }),

  ticket: z.object({
    messages: CreateTicketMessage.array()
  })
});

export type CreateTicketInput = z.infer<typeof CreateTicketInput>;

export const CreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string()
});

export type CreateUser = z.infer<typeof CreateUser>;

export const GorgiasCreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),

  role: z.union([
    z.literal("admin"),
    z.literal("agent"),
    z.literal("basic-agent"),
    z.literal("lite-agent"),
    z.literal("observer-agent")
  ]).optional()
});

export type GorgiasCreateUser = z.infer<typeof GorgiasCreateUser>;

export const GorgiasUser = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string()
});

export type GorgiasUser = z.infer<typeof GorgiasUser>;

export const models = {
  IdEntity: IdEntity,
  SuccessResponse: SuccessResponse,
  ActionResponseError: ActionResponseError,
  User: User,
  AssigneeUser: AssigneeUser,
  RecieverSender: RecieverSender,
  Attachment: Attachment,
  Message: Message,
  Ticket: Ticket,
  CreateTicketMessage: CreateTicketMessage,
  CreateTicketInput: CreateTicketInput,
  CreateUser: CreateUser,
  GorgiasCreateUser: GorgiasCreateUser,
  GorgiasUser: GorgiasUser
};