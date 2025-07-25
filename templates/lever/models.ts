import { z } from "zod";

export const LeverOpportunity = z.object({
  id: z.string(),
  name: z.string(),
  headline: z.string(),
  contact: z.string(),
  emails: z.string().array(),
  phones: z.string().array(),
  confidentiality: z.string(),
  location: z.string(),
  links: z.string().array(),

  archived: z.object({
    reason: z.string(),
    archivedAt: z.number()
  }),

  createdAt: z.number(),
  updatedAt: z.number(),
  lastInteractionAt: z.number(),
  lastAdvancedAt: z.number(),
  snoozedUntil: z.number(),
  archivedAt: z.number(),
  archiveReason: z.string(),
  stage: z.string(),
  stageChanges: z.string().array(),
  owner: z.string(),
  tags: z.string().array(),
  sources: z.string().array(),
  origin: z.string(),
  sourcedBy: z.string(),
  applications: z.string().array(),
  resume: z.string(),
  followers: z.string().array(),

  urls: z.object({
    list: z.string(),
    show: z.string()
  }),

  dataProtection: z.object({}),
  isAnonymized: z.boolean(),
  opportunityLocation: z.string()
});

export type LeverOpportunity = z.infer<typeof LeverOpportunity>;

export const LeverOpportunityApplication = z.object({
  id: z.string(),
  opportunityId: z.string(),
  candidateId: z.string(),
  createdAt: z.number(),
  type: z.string(),
  posting: z.string(),
  postingHiringManager: z.string(),
  postingOwner: z.string(),
  user: z.string(),
  name: z.string(),
  email: z.string(),

  phone: z.object({
    type: z.string(),
    value: z.string()
  }),

  requisitionForHire: z.object({
    id: z.string(),
    requisitionCode: z.string(),
    hiringManagerOnHire: z.string()
  }),

  ownerId: z.string(),
  hiringManager: z.string(),
  company: z.string(),
  links: z.string().array(),
  comments: z.string(),
  customQuestions: z.string().array(),

  archived: z.object({
    reason: z.string(),
    archivedAt: z.number()
  })
});

export type LeverOpportunityApplication = z.infer<typeof LeverOpportunityApplication>;

export const LeverOpportunityFeedback = z.object({
  id: z.string(),
  type: z.string(),
  text: z.string(),
  instructions: z.string(),
  fields: z.string().array(),
  baseTemplateId: z.string(),
  interview: z.string(),
  panel: z.string(),
  user: z.string(),
  createdAt: z.number(),
  completedAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number()
});

export type LeverOpportunityFeedback = z.infer<typeof LeverOpportunityFeedback>;

export const LeverOpportunityInterview = z.object({
  id: z.string(),
  panel: z.string(),
  subject: z.string(),
  note: z.string(),
  interviewers: z.string().array(),
  timezone: z.string(),
  createdAt: z.number(),
  date: z.number(),
  duration: z.number(),
  location: z.string(),
  feedbackTemplate: z.string(),
  feedbackForms: z.string().array(),
  feedbackReminder: z.string(),
  user: z.string(),
  stage: z.string(),
  canceledAt: z.number(),
  postings: z.string().array(),
  gcalEventUrl: z.string()
});

export type LeverOpportunityInterview = z.infer<typeof LeverOpportunityInterview>;

export const LeverOpportunityNote = z.object({
  id: z.string(),
  text: z.string(),
  fields: z.string().array(),
  user: z.string(),
  secret: z.boolean(),
  completedAt: z.number(),
  createdAt: z.number(),
  deletedAt: z.number()
});

export type LeverOpportunityNote = z.infer<typeof LeverOpportunityNote>;

export const LeverOpportunityOffer = z.object({
  id: z.string(),
  createdAt: z.number(),
  status: z.string(),
  creator: z.string(),
  fields: z.string().array(),

  sentDocument: z.object({
    fileName: z.string(),
    uploadedAt: z.number(),
    downloadUrl: z.string()
  }),

  signedDocument: z.object({
    fileName: z.string(),
    uploadedAt: z.number(),
    downloadUrl: z.string()
  })
});

export type LeverOpportunityOffer = z.infer<typeof LeverOpportunityOffer>;

export const LeverPosting = z.object({
  perform_as: z.string().optional(),
  id: z.string(),
  text: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  user: z.string(),
  owner: z.string(),
  hiringManager: z.string(),
  confidentiality: z.string(),

  categories: z.object({
    team: z.string(),
    department: z.string(),
    location: z.string(),
    allLocations: z.string().array(),
    commitment: z.string(),
    level: z.string()
  }),

  content: z.object({
    description: z.string(),
    descriptionHtml: z.string(),
    lists: z.string().array(),
    closing: z.string(),
    closingHtml: z.string()
  }),

  country: z.string(),
  followers: z.string().array(),
  tags: z.string().array(),
  state: z.string(),
  distributionChannels: z.string().array(),
  reqCode: z.string(),
  requisitionCodes: z.string().array(),
  salaryDescription: z.string(),
  salaryDescriptionHtml: z.string(),

  salaryRange: z.object({
    max: z.number(),
    min: z.number(),
    currency: z.string(),
    interval: z.string()
  }),

  urls: z.object({
    list: z.string(),
    show: z.string(),
    apply: z.string()
  }),

  workplaceType: z.string()
});

export type LeverPosting = z.infer<typeof LeverPosting>;

export const LeverPostingApply = z.object({
  id: z.string(),
  text: z.string(),
  customQuestions: z.string().array(),
  eeoQuestions: z.string().array(),
  personalInformation: z.string().array(),
  urls: z.string().array()
});

export type LeverPostingApply = z.infer<typeof LeverPostingApply>;

export const LeverStage = z.object({
  id: z.string(),
  text: z.string()
});

export type LeverStage = z.infer<typeof LeverStage>;

export const LeverCreateNoteInput = z.object({
  opportunityId: z.string(),
  perform_as: z.string(),
  note_id: z.string(),
  value: z.string(),
  secret: z.boolean(),
  score: z.number(),
  notifyFollowers: z.boolean(),
  createdAt: z.number()
});

export type LeverCreateNoteInput = z.infer<typeof LeverCreateNoteInput>;

export const PhoneEntry = z.object({
  value: z.string(),
  type: z.string()
});

export type PhoneEntry = z.infer<typeof PhoneEntry>;

export const ArchievedEntry = z.object({
  archivedAt: z.number(),
  reason: z.string()
});

export type ArchievedEntry = z.infer<typeof ArchievedEntry>;

export const LeverCreateOpportunityInput = z.object({
  perform_as: z.string(),
  parse: z.boolean(),
  perform_as_posting_owner: z.boolean(),
  name: z.string(),
  headline: z.string(),
  stage: z.string(),
  location: z.string(),
  phones: PhoneEntry.array(),
  emails: z.string(),
  links: z.string().array(),
  tags: z.string().array(),
  sources: z.string().array(),
  origin: z.string(),
  owner: z.string(),
  followers: z.string().array(),
  postings: z.string().array(),
  createdAt: z.number(),
  archived: ArchievedEntry,
  contact: z.string().array()
});

export type LeverCreateOpportunityInput = z.infer<typeof LeverCreateOpportunityInput>;

export const UpdateOpportunityStage = z.object({
  perform_as: z.string().optional(),
  stage: z.string(),
  opportunityId: z.string()
});

export type UpdateOpportunityStage = z.infer<typeof UpdateOpportunityStage>;

export const ArchiveOpportunity = z.object({
  perform_as: z.string().optional(),
  reason: z.string(),
  requisitionId: z.string().optional(),
  opportunityId: z.string(),
  cleanInterviews: z.boolean().optional()
});

export type ArchiveOpportunity = z.infer<typeof ArchiveOpportunity>;

export const ArchiveObject = z.object({
  reason: z.string(),
  cleanInterviews: z.boolean().optional(),
  requisitionId: z.string().optional()
});

export type ArchiveObject = z.infer<typeof ArchiveObject>;

export const UpdateLinks = z.object({
  perform_as: z.string().optional(),
  links: z.string().array(),
  opportunityId: z.string(),
  "delete": z.boolean()
});

export type UpdateLinks = z.infer<typeof UpdateLinks>;

export const UpdateTags = z.object({
  opportunityId: z.string(),
  perform_as: z.string().optional(),
  tags: z.string().array(),
  "delete": z.boolean()
});

export type UpdateTags = z.infer<typeof UpdateTags>;

export const UpdateSources = z.object({
  opportunityId: z.string(),
  perform_as: z.string().optional(),
  sources: z.string().array(),
  "delete": z.boolean()
});

export type UpdateSources = z.infer<typeof UpdateSources>;

export const Stages = z.object({
  id: z.string(),
  text: z.string()
});

export type Stages = z.infer<typeof Stages>;

export const GetStages = z.object({
  stages: Stages.array()
});

export type GetStages = z.infer<typeof GetStages>;

export const Users = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  email: z.string(),
  accessRole: z.string(),
  photo: z.union([z.string(), z.null()]),
  createdAt: z.number(),
  deactivatedAt: z.union([z.string(), z.null()]),
  externalDirectoryId: z.union([z.string(), z.null()]),
  linkedContactIds: z.union([z.string().array(), z.null()]),
  jobTitle: z.union([z.string(), z.null()]),
  managerId: z.union([z.string(), z.null()])
});

export type Users = z.infer<typeof Users>;

export const GetUsers = z.object({
  users: Users.array()
});

export type GetUsers = z.infer<typeof GetUsers>;

export const SuccessResponse = z.object({
  success: z.boolean(),
  opportunityId: z.string().optional(),
  response: LeverOpportunity
});

export type SuccessResponse = z.infer<typeof SuccessResponse>;

export const ApplyCandidate = z.object({
  send_confirmation_email: z.boolean().optional(),
  customQuestions: z.any().array(),
  personalInformation: z.any().array(),
  eeoResponses: z.object({}),
  urls: z.any().array(),
  ipAddress: z.string().optional(),
  source: z.string().optional(),
  consent: z.object({}).optional(),
  diversitySurvey: z.object({}).optional(),
  origin: z.string().optional()
});

export type ApplyCandidate = z.infer<typeof ApplyCandidate>;

export const PostingCategories = z.object({
  team: z.string(),
  department: z.string(),
  location: z.string().optional(),
  commitment: z.string().optional(),
  allLocations: z.string().optional().array()
});

export type PostingCategories = z.infer<typeof PostingCategories>;

export const ContentList = z.object({
  text: z.string(),
  content: z.string()
});

export type ContentList = z.infer<typeof ContentList>;

export const PostingContent = z.object({
  descriptionHtml: z.string(),
  lists: ContentList.array(),
  closingPostingHtml: z.string().optional()
});

export type PostingContent = z.infer<typeof PostingContent>;

export const SinglePost = z.object({
  id: z.string()
});

export type SinglePost = z.infer<typeof SinglePost>;

export const QuestionResponse = z.object({
  name: z.string(),
  value: z.string()
});

export type QuestionResponse = z.infer<typeof QuestionResponse>;

export const CustomQuestionResponse = z.object({
  value: z.string()
});

export type CustomQuestionResponse = z.infer<typeof CustomQuestionResponse>;

export const CustomQuestion = z.object({
  id: z.string(),
  fields: CustomQuestionResponse.array()
});

export type CustomQuestion = z.infer<typeof CustomQuestion>;

export const DiversityQuestionResponse = z.object({
  questionId: z.string(),
  questionText: z.string(),
  questionType: z.string(),
  answer: z.string()
});

export type DiversityQuestionResponse = z.infer<typeof DiversityQuestionResponse>;

export const ApplyToPosting = z.object({
  postId: z.string(),
  send_confirmation_email: z.boolean().optional(),
  personalInformation: QuestionResponse.array(),
  eeoResponses: z.object({}),
  urls: QuestionResponse.array(),
  CustomQuestions: CustomQuestion.array(),
  ipAddress: z.string().optional(),
  source: z.string().optional(),

  consent: z.object({
    marketing: z.object({
      provided: z.boolean(),
      compliancePolicyId: z.string()
    }),

    store: z.object({
      provided: z.boolean(),
      compliancePolicyId: z.string()
    })
  }).optional(),

  diversitySurvey: z.object({
    surveyId: z.string(),
    candidateSelectedLocation: z.string(),
    responses: DiversityQuestionResponse.array()
  }).optional(),

  origin: z.string().optional()
});

export type ApplyToPosting = z.infer<typeof ApplyToPosting>;

export const UpdateOpportunity = z.object({
  opportunityId: z.string(),
  perform_as: z.string().optional(),
  "delete": z.boolean().optional(),
  links: z.string().optional().array(),
  sources: z.string().optional().array(),
  stage: z.string().optional(),
  tags: z.string().optional().array(),
  reason: z.string().optional(),
  cleanInterviews: z.boolean().optional(),
  requisitionId: z.string().optional()
});

export type UpdateOpportunity = z.infer<typeof UpdateOpportunity>;

export const StageChangesObject = z.object({
  toStageId: z.string(),
  toStageIndex: z.number(),
  updatedAt: z.number(),
  userId: z.string()
});

export type StageChangesObject = z.infer<typeof StageChangesObject>;

export const ReturnObjUpdateOpportunity = z.object({
  data: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    headline: z.string().optional(),
    contact: z.string().optional(),
    emails: z.string().array().optional(),
    phones: z.string().array().optional(),
    confidentiality: z.string().optional(),
    location: z.string().optional(),
    links: z.string().array().optional(),

    archived: z.object({
      reason: z.string().optional(),
      archivedAt: z.number().optional()
    }).optional(),

    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    lastInteractionAt: z.number().optional(),
    lastAdvancedAt: z.number().optional(),
    snoozedUntil: z.union([z.number(), z.null()]).optional(),
    archivedAt: z.number().optional(),
    archiveReason: z.string().optional(),
    stage: z.string().optional(),
    stageChanges: z.union([StageChangesObject, z.string()]).array().optional(),
    owner: z.string().optional(),
    tags: z.string().array().optional(),
    sources: z.string().array().optional(),
    origin: z.string().optional(),
    sourcedBy: z.string().optional(),
    applications: z.string().array().optional(),
    resume: z.string().optional(),
    followers: z.string().array().optional(),

    urls: z.object({
      list: z.string().optional(),
      show: z.string().optional()
    }).optional(),

    dataProtection: z.union([z.object({}), z.null()]).optional(),
    isAnonymized: z.boolean().optional(),
    opportunityLocation: z.string().optional()
  })
});

export type ReturnObjUpdateOpportunity = z.infer<typeof ReturnObjUpdateOpportunity>;

export const models = {
  LeverOpportunity: LeverOpportunity,
  LeverOpportunityApplication: LeverOpportunityApplication,
  LeverOpportunityFeedback: LeverOpportunityFeedback,
  LeverOpportunityInterview: LeverOpportunityInterview,
  LeverOpportunityNote: LeverOpportunityNote,
  LeverOpportunityOffer: LeverOpportunityOffer,
  LeverPosting: LeverPosting,
  LeverPostingApply: LeverPostingApply,
  LeverStage: LeverStage,
  LeverCreateNoteInput: LeverCreateNoteInput,
  PhoneEntry: PhoneEntry,
  ArchievedEntry: ArchievedEntry,
  LeverCreateOpportunityInput: LeverCreateOpportunityInput,
  UpdateOpportunityStage: UpdateOpportunityStage,
  ArchiveOpportunity: ArchiveOpportunity,
  ArchiveObject: ArchiveObject,
  UpdateLinks: UpdateLinks,
  UpdateTags: UpdateTags,
  UpdateSources: UpdateSources,
  Stages: Stages,
  GetStages: GetStages,
  Users: Users,
  GetUsers: GetUsers,
  SuccessResponse: SuccessResponse,
  ApplyCandidate: ApplyCandidate,
  PostingCategories: PostingCategories,
  ContentList: ContentList,
  PostingContent: PostingContent,
  SinglePost: SinglePost,
  QuestionResponse: QuestionResponse,
  CustomQuestionResponse: CustomQuestionResponse,
  CustomQuestion: CustomQuestion,
  DiversityQuestionResponse: DiversityQuestionResponse,
  ApplyToPosting: ApplyToPosting,
  UpdateOpportunity: UpdateOpportunity,
  StageChangesObject: StageChangesObject,
  ReturnObjUpdateOpportunity: ReturnObjUpdateOpportunity
};
