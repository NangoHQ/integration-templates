import { z } from "zod";

export const AshbyCandidate = z.object({
  id: z.string(),
  createdAt: z.date(),
  name: z.string(),

  primaryEmailAddress: z.object({
    value: z.string(),
    type: z.string(),
    isPrimary: z.boolean()
  }),

  emailAddresses: z.string().array(),

  primaryPhoneNumber: z.object({
    value: z.string(),
    type: z.string(),
    isPrimary: z.boolean()
  }),

  phoneNumbers: z.string().array(),
  socialLinks: z.string().array(),
  tags: z.string().array(),
  position: z.string(),
  company: z.string(),
  school: z.string(),
  applicationIds: z.string().array(),

  resumeFileHandle: z.object({
    id: z.string(),
    name: z.string(),
    handle: z.string()
  }),

  fileHandles: z.string().array(),
  customFields: z.string().array(),
  profileUrl: z.string(),

  source: z.object({
    id: z.string(),
    title: z.string(),
    isArchived: z.boolean(),

    sourceType: z.object({
      id: z.string(),
      title: z.string(),
      isArchived: z.boolean()
    })
  }),

  creditedToUser: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    globalRole: z.string(),
    isEnabled: z.boolean(),
    updatedAt: z.date()
  })
});

export type AshbyCandidate = z.infer<typeof AshbyCandidate>;

export const AshbyJob = z.object({
  id: z.string(),
  title: z.string(),
  confidential: z.boolean(),
  status: z.string(),
  employmentType: z.string(),
  locationId: z.string(),
  departmentId: z.string(),
  defaultInterviewPlanId: z.string(),
  interviewPlanIds: z.string().array(),
  customFields: z.string().array(),
  jobPostingIds: z.string().array(),
  customRequisitionId: z.string(),
  hiringTeam: z.string().array(),
  updatedAt: z.date(),

  location: z.object({
    id: z.string(),
    name: z.string(),
    isArchived: z.boolean(),

    address: z.object({
      postalAddress: z.object({
        addressCountry: z.string(),
        addressRegion: z.string(),
        addressLocality: z.string()
      })
    }),

    isRemote: z.boolean()
  }),

  openings: z.string().array()
});

export type AshbyJob = z.infer<typeof AshbyJob>;

export const AshbyCreateApplicationResponse = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  status: z.string(),
  customFields: z.string().array(),

  candidate: z.object({
    id: z.string(),
    name: z.string(),

    primaryEmailAddress: z.object({
      value: z.string(),
      type: z.string(),
      isPrimary: z.boolean()
    }),

    primaryPhoneNumber: z.object({
      value: z.string(),
      type: z.string(),
      isPrimary: z.boolean()
    })
  }),

  currentInterviewStage: z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    orderInInterviewPlan: z.number(),
    interviewPlanId: z.string()
  }),

  source: z.object({
    id: z.string(),
    title: z.string(),
    isArchived: z.boolean(),

    sourceType: z.object({
      id: z.string(),
      title: z.string(),
      isArchived: z.boolean()
    })
  }),

  archiveReason: z.object({
    id: z.string(),
    text: z.string(),
    reasonType: z.string(),
    isArchived: z.boolean()
  }),

  job: z.object({
    id: z.string(),
    title: z.string(),
    locationId: z.string(),
    departmentId: z.string()
  }),

  creditedToUser: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    globalRole: z.string(),
    isEnabled: z.boolean(),
    updatedAt: z.date()
  }),

  hiringTeam: z.string().array(),
  appliedViaJobPostingId: z.string()
});

export type AshbyCreateApplicationResponse = z.infer<typeof AshbyCreateApplicationResponse>;

export const InterviewStageListResponse = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
  orderInInterviewPlan: z.number(),
  interviewStageGroupId: z.string().optional(),
  interviewPlanId: z.string()
});

export type InterviewStageListResponse = z.infer<typeof InterviewStageListResponse>;

export const StagesResponse = z.object({
  stages: InterviewStageListResponse.array()
});

export type StagesResponse = z.infer<typeof StagesResponse>;

export const InterviewStageList = z.object({
  interviewPlanId: z.string()
});

export type InterviewStageList = z.infer<typeof InterviewStageList>;

export const AshbyCreateNoteResponse = z.object({
  id: z.string(),
  createdAt: z.date(),
  content: z.string(),

  author: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string()
  })
});

export type AshbyCreateNoteResponse = z.infer<typeof AshbyCreateNoteResponse>;

export const AshbyCreateCandidateInput = z.object({
  candidateId: z.string(),
  jobId: z.string(),
  interviewPlanId: z.string(),
  interviewStageId: z.string(),
  sourceId: z.string(),
  creditedToUserId: z.string()
});

export type AshbyCreateCandidateInput = z.infer<typeof AshbyCreateCandidateInput>;

export const NoteObject = z.object({
  value: z.string(),
  type: z.string()
});

export type NoteObject = z.infer<typeof NoteObject>;

export const AshbyCreateNoteInput = z.object({
  candidateId: z.string(),
  note: z.union([z.string(), NoteObject]),
  sendNotifications: z.boolean()
});

export type AshbyCreateNoteInput = z.infer<typeof AshbyCreateNoteInput>;

export const ChangeStage = z.object({
  applicationId: z.string(),
  interviewStageId: z.string(),
  archiveReasonId: z.string().optional()
});

export type ChangeStage = z.infer<typeof ChangeStage>;

export const ChangeSource = z.object({
  applicationId: z.string(),
  sourceId: z.string()
});

export type ChangeSource = z.infer<typeof ChangeSource>;

export const CreateCandidate = z.object({
  name: z.string(),
  email: z.string().optional(),
  phoneNumber: z.string().optional(),
  linkedInUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  website: z.string().optional(),
  alternateEmailAddresses: z.string().optional().array(),
  sourceId: z.string().optional(),
  creditedToUserId: z.string().optional(),

  location: z.object({
    city: z.string().optional(),
    region: z.string().optional(),
    country: z.string().optional()
  }).optional(),

  createdAt: z.date().optional()
});

export type CreateCandidate = z.infer<typeof CreateCandidate>;

export const EmailAddressObject = z.object({
  value: z.string(),
  type: z.string(),
  isPrimary: z.boolean()
});

export type EmailAddressObject = z.infer<typeof EmailAddressObject>;

export const PrimaryNumberObject = z.object({
  value: z.string(),
  type: z.string(),
  isPrimary: z.boolean()
});

export type PrimaryNumberObject = z.infer<typeof PrimaryNumberObject>;

export const PhoneNumbersObject = z.object({
  value: z.string(),
  type: z.string(),
  isPrimary: z.boolean()
});

export type PhoneNumbersObject = z.infer<typeof PhoneNumbersObject>;

export const SocialLinksObject = z.object({
  type: z.string(),
  url: z.string()
});

export type SocialLinksObject = z.infer<typeof SocialLinksObject>;

export const TagsObject = z.object({
  id: z.string(),
  title: z.string(),
  isArchived: z.boolean()
});

export type TagsObject = z.infer<typeof TagsObject>;

export const FileaHandlesObject = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string()
});

export type FileaHandlesObject = z.infer<typeof FileaHandlesObject>;

export const LocationComponentsObject = z.object({
  type: z.string(),
  name: z.string()
});

export type LocationComponentsObject = z.infer<typeof LocationComponentsObject>;

export const AshbyCreateCandidateResponse = z.object({
  id: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  name: z.string(),

  primaryEmailAddress: z.object({
    value: z.string(),
    type: z.string(),
    isPrimary: z.boolean()
  }).optional(),

  emailAddresses: EmailAddressObject.array(),
  primaryPhoneNumber: PrimaryNumberObject.array(),
  phoneNumbers: PhoneNumbersObject.array(),
  socialLinks: SocialLinksObject.array(),
  tags: TagsObject.array(),
  position: z.union([z.string(), z.null()]).optional(),
  company: z.union([z.string(), z.null()]).optional(),
  applicationIds: z.string().array(),

  resumeFileHandle: z.object({
    id: z.string(),
    name: z.string(),
    handle: z.string()
  }).optional(),

  fileHandles: FileaHandlesObject.array(),
  customFields: z.object({}).optional().array(),
  profileUrl: z.string(),

  source: z.object({
    id: z.string(),
    title: z.string(),
    isArchived: z.boolean(),

    sourceType: z.object({
      id: z.string(),
      title: z.string(),
      isArchived: z.string()
    }).optional()
  }).optional(),

  creditedToUser: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    globalRole: z.string(),
    isEnabled: z.boolean(),
    updatedAt: z.date()
  }).optional(),

  timezone: z.string().optional(),

  primaryLocation: z.object({
    id: z.string(),
    locationSummary: z.string(),
    locationComponents: LocationComponentsObject.array()
  }).optional()
});

export type AshbyCreateCandidateResponse = z.infer<typeof AshbyCreateCandidateResponse>;

export const HiringTeamObject = z.object({
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.string(),
  userId: z.string()
});

export type HiringTeamObject = z.infer<typeof HiringTeamObject>;

export const AshByApplicationSuccessObject = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  status: z.string(),
  customFields: z.object({}).array(),

  candidate: z.object({
    id: z.string(),
    name: z.string(),

    primaryEmailAddress: z.object({
      value: z.string(),
      type: z.any(),
      isPrimary: z.string()
    }).optional(),

    primaryPhoneNumber: z.object({}).optional()
  }),

  currentInterviewStage: z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    orderInInterviewPlan: z.number(),
    interviewStageGroupId: z.string().optional(),
    interviewPlanId: z.string()
  }),

  source: z.object({
    id: z.string(),
    title: z.string(),
    isArchived: z.boolean(),

    sourceType: z.object({
      id: z.string(),
      title: z.string(),
      isArchived: z.boolean()
    })
  }).optional(),

  archiveReason: z.object({
    id: z.string(),
    text: z.string(),
    reasonType: z.string(),
    isArchived: z.boolean()
  }).optional(),

  archivedAt: z.date().optional(),

  job: z.object({
    id: z.string(),
    title: z.string(),
    locationId: z.string(),
    departmentId: z.string()
  }),

  creditedToUser: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().optional(),
    globalRole: z.string(),
    isEnabled: z.boolean(),
    updatedAt: z.date()
  }).optional(),

  hiringTeam: HiringTeamObject.array(),
  appliedViaJobPostingId: z.string().optional()
});

export type AshByApplicationSuccessObject = z.infer<typeof AshByApplicationSuccessObject>;

export const AshbyResponse = z.object({
  success: z.boolean(),
  errors: z.string().optional().array(),

  results: z.union([
    AshByApplicationSuccessObject,
    AshbyCreateCandidateResponse,
    InterviewStageListResponse
  ]).optional(),

  moreDataAvailable: z.boolean().optional()
});

export type AshbyResponse = z.infer<typeof AshbyResponse>;

export const UpdateApplication = z.object({
  applicationId: z.string(),
  sourceId: z.string().optional(),
  creditedToUserId: z.string().optional(),
  createdAt: z.date().optional(),
  sendNotifications: z.boolean().optional()
});

export type UpdateApplication = z.infer<typeof UpdateApplication>;

export const ApplicationHistoryObject = z.object({
  stageId: z.string(),
  stageNumber: z.number(),
  enteredStageAt: z.date(),
  applicationHistoryId: z.string().optional(),
  archiveReasonId: z.string().optional()
});

export type ApplicationHistoryObject = z.infer<typeof ApplicationHistoryObject>;

export const UpdateAshbyApplication = z.object({
  applicationId: z.string(),
  sourceId: z.string().optional(),
  interviewStageId: z.string().optional(),
  archiveReasonId: z.string().optional(),
  applicationHistory: ApplicationHistoryObject.array()
});

export type UpdateAshbyApplication = z.infer<typeof UpdateAshbyApplication>;

export const UpdateHistory = z.object({
  applicationId: z.string(),
  applicationHistory: ApplicationHistoryObject.array()
});

export type UpdateHistory = z.infer<typeof UpdateHistory>;
export const Anonymous_ashby_action_applicationupdate_input = z.union([ChangeSource, ChangeStage, UpdateHistory]);
export type Anonymous_ashby_action_applicationupdate_input = z.infer<typeof Anonymous_ashby_action_applicationupdate_input>;

export const AshbyCandidateMetadata = z.object({
    candidatelastsyncToken: z.string().optional()
});

export const AshbyJobMetadata = z.object({
    jobslastsyncToken: z.string().optional()
});

export const models = {
  AshbyCandidate: AshbyCandidate,
  AshbyCandidateMetadata,
  AshbyJobMetadata,
  AshbyJob: AshbyJob,
  AshbyCreateApplicationResponse: AshbyCreateApplicationResponse,
  InterviewStageListResponse: InterviewStageListResponse,
  StagesResponse: StagesResponse,
  InterviewStageList: InterviewStageList,
  AshbyCreateNoteResponse: AshbyCreateNoteResponse,
  AshbyCreateCandidateInput: AshbyCreateCandidateInput,
  NoteObject: NoteObject,
  AshbyCreateNoteInput: AshbyCreateNoteInput,
  ChangeStage: ChangeStage,
  ChangeSource: ChangeSource,
  CreateCandidate: CreateCandidate,
  EmailAddressObject: EmailAddressObject,
  PrimaryNumberObject: PrimaryNumberObject,
  PhoneNumbersObject: PhoneNumbersObject,
  SocialLinksObject: SocialLinksObject,
  TagsObject: TagsObject,
  FileaHandlesObject: FileaHandlesObject,
  LocationComponentsObject: LocationComponentsObject,
  AshbyCreateCandidateResponse: AshbyCreateCandidateResponse,
  HiringTeamObject: HiringTeamObject,
  AshByApplicationSuccessObject: AshByApplicationSuccessObject,
  AshbyResponse: AshbyResponse,
  UpdateApplication: UpdateApplication,
  ApplicationHistoryObject: ApplicationHistoryObject,
  UpdateAshbyApplication: UpdateAshbyApplication,
  UpdateHistory: UpdateHistory,
  Anonymous_ashby_action_applicationupdate_input: Anonymous_ashby_action_applicationupdate_input
};
