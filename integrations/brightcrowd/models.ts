import { z } from "zod";

export const Metadata = z.object({
  bookIds: z.string().array(),
  timeframe: z.union([z.any(), z.any(), z.any(), z.literal("all")]).optional()
});

export type Metadata = z.infer<typeof Metadata>;

export const Affiliation = z.object({
  type: z.union([
    z.literal("OtherAffiliation"),
    z.literal("UniversityAffiliation"),
    z.literal("CompanyAffiliation")
  ]),

  organization: z.union([z.string(), z.null()]).optional(),
  major: z.union([z.string(), z.string().array()]).optional(),
  degree: z.union([z.string(), z.string().array()]).optional(),
  school: z.union([z.string(), z.string().array()]).optional(),
  graduationYear: z.union([z.number(), z.null()]).optional(),
  specialty: z.union([z.string(), z.string().array()]).optional(),
  category: z.union([z.string(), z.string().array()]).optional(),
  title: z.string().optional(),
  startYear: z.union([z.number(), z.null()]).optional(),
  endYear: z.union([z.number(), z.null()]).optional(),
  office: z.union([z.string(), z.string().array()]).optional(),
  group: z.union([z.string(), z.string().array()]).optional()
});

export type Affiliation = z.infer<typeof Affiliation>;

export const QuestionField = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string(),
  headline: z.union([z.string(), z.null()]).optional(),
  placeholder: z.union([z.string(), z.null()]).optional(),
  active: z.boolean(),
  required: z.boolean(),
  maxcount: z.union([z.number(), z.null()]).optional(),
  maxlength: z.union([z.number(), z.null()]).optional(),
  allowMentions: z.boolean(),
  customizable: z.boolean()
});

export type QuestionField = z.infer<typeof QuestionField>;

export const Question = z.object({
  id: z.string(),
  type: z.union([z.string(), z.null()]),
  name: z.union([z.string(), z.null()]),
  description: z.union([z.string(), z.null()]).optional(),
  warning: z.union([z.string(), z.null()]).optional(),
  route: z.union([z.string(), z.null()]),
  questionHeader: z.union([z.string(), z.null()]),
  questionSubheader: z.union([z.string(), z.null()]).optional(),
  headline: z.union([z.string(), z.null()]).optional(),
  active: z.boolean(),
  required: z.boolean(),
  adminOnly: z.boolean(),
  fields: QuestionField.array()
});

export type Question = z.infer<typeof Question>;

export const FrontMatterSection = z.object({
  uri: z.string(),
  title: z.string(),
  snippet: z.string(),
  disabled: z.boolean().optional()
});

export type FrontMatterSection = z.infer<typeof FrontMatterSection>;

export const FrontMatter = z.object({
  sections: FrontMatterSection.array()
});

export type FrontMatter = z.infer<typeof FrontMatter>;

export const Preface = z.object({
  text: z.union([z.string(), z.null()]),
  docId: z.union([z.string(), z.null()]).optional(),
  video: z.union([z.string(), z.null()]).optional(),
  pictures: z.union([z.string().array(), z.null()]).optional()
});

export type Preface = z.infer<typeof Preface>;

export const BookById = z.object({
  id: z.string(),
  alias: z.string(),
  name: z.string(),
  pictureId: z.union([z.string(), z.null()]),
  config: z.union([z.string(), z.null()]),
  coverPictureId: z.union([z.string(), z.null()]),
  bannerPictureId: z.union([z.string(), z.null()]),
  affiliation: z.union([Affiliation, z.null()]),
  questions: Question.array(),
  flags: z.string().array(),
  publishedAt: z.union([z.string(), z.null()]).optional(),
  closedAt: z.union([z.string(), z.null()]).optional(),
  lockedAt: z.union([z.string(), z.null()]).optional(),
  created: z.string(),
  modified: z.string(),
  frontMatter: z.union([FrontMatter, z.null()]),
  preface: z.union([Preface, z.null()]).optional()
});

export type BookById = z.infer<typeof BookById>;

export const Book = z.object({
  id: z.string(),
  alias: z.string(),
  name: z.string(),
  pictureId: z.union([z.string(), z.null()]),
  config: z.union([z.string(), z.null()]),
  coverPictureId: z.union([z.string(), z.null()]),
  bannerPictureId: z.union([z.string(), z.null()]),
  affiliation: z.union([Affiliation, z.null()]),
  questions: Question.array(),
  flags: z.string().array(),
  publishedAt: z.union([z.string(), z.null()]).optional(),
  closedAt: z.union([z.string(), z.null()]).optional(),
  lockedAt: z.union([z.string(), z.null()]).optional(),
  created: z.string(),
  modified: z.string(),
  frontMatter: z.union([FrontMatter, z.null()]),
  preface: z.union([Preface, z.null()]).optional()
});

export type Book = z.infer<typeof Book>;

export const Instruction = z.object({
  addPage: z.union([z.string(), z.null()]),
  editPage: z.union([z.string(), z.null()]),
  requestAccess: z.union([z.string(), z.null()])
});

export type Instruction = z.infer<typeof Instruction>;

export const Picture = z.object({
  type: z.union([z.literal("profile"), z.literal("content"), z.literal("caption")]),
  id: z.string(),
  caption: z.union([z.string(), z.null()]).optional()
});

export type Picture = z.infer<typeof Picture>;

export const Video = z.object({
  url: z.string(),
  caption: z.union([z.string(), z.null()]).optional()
});

export type Video = z.infer<typeof Video>;

export const Page = z.object({
  id: z.string(),
  alias: z.string(),
  name: z.string(),
  status: z.union([z.literal("draft"), z.literal("published"), z.literal("hidden")]),

  content: z.object({
    firstName: z.string(),
    lastName: z.string(),
    previousName: z.union([z.string(), z.null()]).optional(),
    suffix: z.string().optional(),
    partnerFirstName: z.union([z.string(), z.null()]).optional(),
    partnerLastName: z.union([z.string(), z.null()]).optional(),
    pronouns: z.string().optional(),
    pictureId: z.union([z.string(), z.null()]).optional(),
    audioId: z.union([z.string(), z.null()]).optional()
  }),

  pictures: z.union([Picture.array(), z.null()]).optional(),
  videos: z.union([Video.array(), z.null()]).optional(),
  tagUsers: z.union([z.string().array(), z.null()]).optional(),
  homeTown: z.union([z.string(), z.null()]).optional(),
  currentCity: z.union([z.string(), z.null()]).optional(),
  campusResidence: z.union([z.string(), z.null()]).optional(),
  affiliations: z.union([Affiliation.array(), z.null()]).optional(),
  plan: z.union([z.literal("school"), z.literal("work"), z.literal("other")]).optional(),
  created: z.string(),
  modifiedByUserAt: z.union([z.string(), z.null()]).optional(),
  completedByUserAt: z.union([z.string(), z.null()]).optional(),
  externalId: z.string().optional()
});

export type Page = z.infer<typeof Page>;

export const Notification = z.object({
  uri: z.string(),
  topicUri: z.string(),
  status: z.string(),
  messageCount: z.number(),
  openCount: z.number(),
  clickCount: z.number(),
  uniqueOpenCount: z.number(),
  uniqueClickCount: z.number(),
  bounceCount: z.number()
});

export type Notification = z.infer<typeof Notification>;

export const Invitations = z.object({
  messageCount: z.number(),
  uniqueOpenCount: z.number(),
  uniqueClickCount: z.number(),
  bounceCount: z.number(),
  uniqueInvitationOpenUserCount: z.number(),
  uniqueInvitationBounceUserCount: z.number()
});

export type Invitations = z.infer<typeof Invitations>;

export const WebStats = z.object({
  dateRange: z.string(),

  values: z.object({
    visitors: z.number(),
    totalPageViews: z.number(),
    sessions: z.number(),
    socialClicks: z.number()
  }),

  previousValues: z.object({
    visitors: z.number(),
    totalPageViews: z.number(),
    sessions: z.number(),
    socialClicks: z.number()
  })
});

export type WebStats = z.infer<typeof WebStats>;

export const BookStats = z.object({
  values: z.object({
    pagesCreated: z.number(),
    pagesUpdated: z.number(),
    taggedUsers: z.number()
  }),

  previousValues: z.object({
    pagesCreated: z.number(),
    pagesUpdated: z.number(),
    taggedUsers: z.number()
  })
});

export type BookStats = z.infer<typeof BookStats>;

export const EmailStats = z.object({
  notifications: Notification.array(),
  invitations: Invitations,
  web: WebStats,
  book: BookStats
});

export type EmailStats = z.infer<typeof EmailStats>;

export const BookAnalytics = z.object({
  id: z.string(),
  email: EmailStats,
  web: WebStats,
  book: BookStats
});

export type BookAnalytics = z.infer<typeof BookAnalytics>;

export const models = {
  Metadata: Metadata,
  Affiliation: Affiliation,
  QuestionField: QuestionField,
  Question: Question,
  FrontMatterSection: FrontMatterSection,
  FrontMatter: FrontMatter,
  Preface: Preface,
  BookById: BookById,
  Book: Book,
  Instruction: Instruction,
  Picture: Picture,
  Video: Video,
  Page: Page,
  Notification: Notification,
  Invitations: Invitations,
  WebStats: WebStats,
  BookStats: BookStats,
  EmailStats: EmailStats,
  BookAnalytics: BookAnalytics
};