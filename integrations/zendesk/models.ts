import { z } from "zod";

export const IdEntity = z.object({
  id: z.string()
});

export type IdEntity = z.infer<typeof IdEntity>;

export const SuccessResponse = z.object({
  success: z.boolean()
});

export type SuccessResponse = z.infer<typeof SuccessResponse>;

export const CreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  role: z.union([z.literal("admin"), z.literal("agent")]).optional()
});

export type CreateUser = z.infer<typeof CreateUser>;

export const User = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  user_fields: z.record(z.string(), z.any()).optional()
});

export type User = z.infer<typeof User>;

export const CategoryCreate = z.object({
  category: z.object({
    name: z.string(),
    description: z.string().optional()
  })
});

export type CategoryCreate = z.infer<typeof CategoryCreate>;

export const Category = z.object({
  id: z.string(),
  url: z.string(),
  name: z.string(),
  description: z.string()
});

export type Category = z.infer<typeof Category>;

export const SectionCreate = z.object({
  category_id: z.number(),

  section: z.object({
    name: z.string(),
    description: z.string().optional()
  })
});

export type SectionCreate = z.infer<typeof SectionCreate>;

export const Section = z.object({
  id: z.string(),
  url: z.string(),
  category_id: z.number(),
  name: z.string(),
  description: z.string()
});

export type Section = z.infer<typeof Section>;

export const ArticleLite = z.object({
  title: z.string(),
  id: z.string(),
  url: z.string()
});

export type ArticleLite = z.infer<typeof ArticleLite>;

export const ArticleResponse = z.object({
  articles: ArticleLite.array()
});

export type ArticleResponse = z.infer<typeof ArticleResponse>;

export const Article = z.object({
  title: z.string(),
  id: z.string(),
  url: z.string(),
  locale: z.string(),
  user_segment_id: z.union([z.number(), z.null()]),
  permission_group_id: z.number(),
  author_id: z.number(),
  body: z.string(),
  comments_disabled: z.boolean(),
  content_tag_ids: z.number().array(),
  created_at: z.string(),
  draft: z.boolean(),
  edited_at: z.string(),
  html_url: z.string(),
  label_names: z.string().array(),
  outdated: z.boolean(),
  outdated_locales: z.string().array(),
  position: z.number(),
  promoted: z.boolean(),
  section_id: z.number(),
  source_locale: z.string(),
  updated_at: z.string(),
  vote_count: z.number(),
  vote_sum: z.number()
});

export type Article = z.infer<typeof Article>;

export const SingleArticleResponse = z.object({
  article: Article
});

export type SingleArticleResponse = z.infer<typeof SingleArticleResponse>;

export const ArticleInput = z.object({
  id: z.string()
});

export type ArticleInput = z.infer<typeof ArticleInput>;

export const TicketCreate = z.object({
  ticket: z.object({
    comment: z.object({
      body: z.string().optional(),
      html_body: z.string().optional()
    }),

    assignee_email: z.string().optional(),
    assignee_id: z.number().optional(),
    brand_id: z.number().optional(),
    due_at: z.string().optional(),

    type: z.union([
      z.literal("problem"),
      z.literal("incident"),
      z.literal("question"),
      z.literal("task")
    ]).optional(),

    status: z.union([
      z.literal("new"),
      z.literal("open"),
      z.literal("pending"),
      z.literal("hold"),
      z.literal("solved"),
      z.literal("closed.")
    ]).optional(),

    metadata: z.object({}).catchall(z.any()).optional()
  })
});

export type TicketCreate = z.infer<typeof TicketCreate>;

export const CreatedTicket = z.object({
  id: z.string(),
  url: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  subject: z.union([z.string(), z.null()]),
  description: z.string(),
  priority: z.union([z.string(), z.null()]),
  status: z.string()
});

export type CreatedTicket = z.infer<typeof CreatedTicket>;

export const Via = z.object({
  channel: z.string(),

  source: z.object({
    from: z.record(z.string(), z.any()),
    to: z.record(z.string(), z.any()),
    rel: z.union([z.string(), z.null()])
  })
});

export type Via = z.infer<typeof Via>;

export const CustomFields = z.object({
  id: z.number(),
  value: z.union([z.string(), z.null()])
});

export type CustomFields = z.infer<typeof CustomFields>;

export const Ticket = z.object({
  url: z.union([z.string(), z.null()]),
  id: z.string(),
  external_id: z.union([z.string(), z.null()]),
  via: z.union([Via, z.null()]),
  created_at: z.union([z.string(), z.null()]),
  updated_at: z.union([z.string(), z.null()]),
  generated_timestamp: z.union([z.number(), z.null()]),
  type: z.union([z.string(), z.null()]),
  subject: z.union([z.string(), z.null()]),
  raw_subject: z.union([z.string(), z.null()]),
  description: z.union([z.string(), z.null()]),
  priority: z.union([z.string(), z.null()]),
  status: z.union([z.string(), z.null()]),
  recipient: z.union([z.string(), z.null()]),
  requester_id: z.union([z.number(), z.null()]),
  submitter_id: z.union([z.number(), z.null()]),
  assignee_id: z.union([z.number(), z.null()]),
  organization_id: z.union([z.number(), z.null()]),
  group_id: z.union([z.number(), z.null()]),
  collaborator_ids: z.union([z.number().array(), z.null()]),
  follower_ids: z.union([z.number().array(), z.null()]),
  email_cc_ids: z.union([z.number().array(), z.null()]),
  forum_topic_id: z.union([z.string(), z.null()]),
  problem_id: z.union([z.string(), z.null()]),
  has_incidents: z.union([z.boolean(), z.null()]),
  is_public: z.union([z.boolean(), z.null()]),
  due_at: z.union([z.string(), z.null()]),
  tags: z.union([z.string().array(), z.null()]),
  custom_fields: z.union([CustomFields.array(), z.null()]),
  satisfaction_rating: z.union([z.record(z.string(), z.any()), z.null()]),
  sharing_agreement_ids: z.union([z.number().array(), z.null()]),
  custom_status_id: z.union([z.number(), z.null()]),
  fields: z.union([CustomFields.array(), z.null()]),
  followup_ids: z.union([z.number().array(), z.null()]),
  ticket_form_id: z.union([z.number(), z.null()]),
  brand_id: z.union([z.number(), z.null()]),
  allow_channelback: z.union([z.boolean(), z.null()]),
  allow_attachments: z.union([z.boolean(), z.null()]),
  from_messaging_channel: z.union([z.boolean(), z.null()])
});

export type Ticket = z.infer<typeof Ticket>;

export const SearchTicketInput = z.object({
  query: z.string()
});

export type SearchTicketInput = z.infer<typeof SearchTicketInput>;

export const SearchTicket = z.object({
  id: z.string(),
  url: z.string(),
  external_id: z.union([z.string(), z.null()]),
  requester_id: z.string(),
  requester_name: z.string(),
  assignee_id: z.union([z.string(), z.null()]),
  assignee_name: z.union([z.string(), z.null()]),
  assignee_avatar: z.union([z.string(), z.null()]),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  is_public: z.boolean(),
  subject: z.union([z.string(), z.null()]),
  description: z.string(),
  priority: z.union([z.string(), z.null()]),
  tags: z.string().array()
});

export type SearchTicket = z.infer<typeof SearchTicket>;

export const SearchTicketOutput = z.object({
  tickets: SearchTicket.array()
});

export type SearchTicketOutput = z.infer<typeof SearchTicketOutput>;

export const models = {
  IdEntity: IdEntity,
  SuccessResponse: SuccessResponse,
  CreateUser: CreateUser,
  User: User,
  CategoryCreate: CategoryCreate,
  Category: Category,
  SectionCreate: SectionCreate,
  Section: Section,
  ArticleLite: ArticleLite,
  ArticleResponse: ArticleResponse,
  Article: Article,
  SingleArticleResponse: SingleArticleResponse,
  ArticleInput: ArticleInput,
  TicketCreate: TicketCreate,
  CreatedTicket: CreatedTicket,
  Via: Via,
  CustomFields: CustomFields,
  Ticket: Ticket,
  SearchTicketInput: SearchTicketInput,
  SearchTicket: SearchTicket,
  SearchTicketOutput: SearchTicketOutput
};
