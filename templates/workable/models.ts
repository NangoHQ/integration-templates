import { z } from "zod";

export const WorkableCandidate = z.object({
  id: z.string(),
  name: z.string(),
  firstname: z.string(),
  lastname: z.string(),
  headline: z.string(),

  account: z.object({
    subdomain: z.string(),
    name: z.string()
  }),

  job: z.object({
    shortcode: z.string(),
    title: z.string()
  }),

  stage: z.string(),
  disqualified: z.boolean(),
  disqualification_reason: z.string(),
  hired_at: z.date(),
  sourced: z.boolean(),
  profile_url: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string(),
  domain: z.string(),
  created_at: z.date(),
  updated_at: z.date()
});

export type WorkableCandidate = z.infer<typeof WorkableCandidate>;

export const WorkableJobsCandidate = z.object({
  id: z.string(),
  name: z.string(),
  firstname: z.string(),
  lastname: z.string(),
  headline: z.string(),

  account: z.object({
    subdomain: z.string(),
    name: z.string()
  }),

  job: z.object({
    shortcode: z.string(),
    title: z.string()
  }),

  stage: z.string(),
  disqualified: z.boolean(),
  disqualification_reason: z.string(),
  hired_at: z.date(),
  sourced: z.boolean(),
  profile_url: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string(),
  domain: z.string(),
  created_at: z.date(),
  updated_at: z.date()
});

export type WorkableJobsCandidate = z.infer<typeof WorkableJobsCandidate>;

export const WorkableCandidateActivity = z.object({
  id: z.string(),
  action: z.string(),
  stage_name: z.string(),
  created_at: z.date(),
  body: z.string(),

  member: z.object({
    id: z.string(),
    name: z.string()
  }),

  rating: z.object({})
});

export type WorkableCandidateActivity = z.infer<typeof WorkableCandidateActivity>;

export const WorkableCandidateOffer = z.object({
  id: z.string(),

  candidate: z.object({
    id: z.string(),
    name: z.string()
  }),

  created_at: z.date(),
  document_variables: z.any().array(),
  documents: z.any().array(),
  state: z.string()
});

export type WorkableCandidateOffer = z.infer<typeof WorkableCandidateOffer>;

export const WorkableJob = z.object({
  id: z.string(),
  title: z.string(),
  full_title: z.string(),
  shortcode: z.string(),
  code: z.string(),
  state: z.string(),
  sample: z.boolean(),
  department: z.string(),
  department_hierarchy: z.any().array(),
  url: z.string(),
  application_url: z.string(),
  shortlink: z.string(),

  location: z.object({
    location_str: z.string(),
    country: z.string(),
    country_code: z.string(),
    region: z.string(),
    region_code: z.string(),
    city: z.string(),
    zip_code: z.string(),
    telecommuting: z.boolean(),
    workplace_type: z.string()
  }),

  locations: z.any().array(),

  salary: z.object({
    salary_from: z.number(),
    salary_to: z.number(),
    salary_currency: z.string()
  }),

  created_at: z.date()
});

export type WorkableJob = z.infer<typeof WorkableJob>;

export const WorkableJobQuestion = z.object({
  id: z.string(),
  body: z.string(),
  type: z.string(),
  required: z.boolean(),
  single_answer: z.boolean(),

  choices: z.object({
    id: z.string(),
    body: z.string()
  }),

  supported_file_types: z.any().array(),
  max_file_size: z.number()
});

export type WorkableJobQuestion = z.infer<typeof WorkableJobQuestion>;

export const WorkableMember = z.object({
  id: z.string(),
  name: z.string(),
  headline: z.string(),
  email: z.string(),
  role: z.string()
});

export type WorkableMember = z.infer<typeof WorkableMember>;

export const WorkableCreateCandidateResponse = z.object({
  status: z.string(),

  candidate: z.object({
    id: z.string(),
    name: z.string(),
    firstname: z.string(),
    lastname: z.string(),
    headline: z.string(),

    account: z.object({
      subdomain: z.string(),
      name: z.string()
    }),

    job: z.object({
      shortcode: z.string(),
      title: z.string()
    }),

    stage: z.string(),
    disqualified: z.boolean(),
    disqualification_reason: z.string(),
    hired_at: z.date(),
    sourced: z.boolean(),
    profile_url: z.string(),
    address: z.string(),
    phone: z.string(),
    email: z.string(),
    domain: z.string(),
    created_at: z.date(),
    updated_at: z.date(),
    image_url: z.string(),
    outbound_mailbox: z.string(),
    uploader_id: z.string(),
    cover_letter: z.string(),
    summary: z.string(),
    education_entries: z.any().array(),
    experience_entries: z.any().array(),
    skills: z.any().array(),
    answers: z.any().array(),
    resume_url: z.string(),
    tags: z.any().array(),

    location: z.object({
      location_str: z.string(),
      country: z.string(),
      country_code: z.string(),
      region: z.string(),
      region_code: z.string(),
      city: z.string(),
      zip_code: z.string()
    })
  })
});

export type WorkableCreateCandidateResponse = z.infer<typeof WorkableCreateCandidateResponse>;

export const WorkableCreateCommentResponse = z.object({
  id: z.string()
});

export type WorkableCreateCommentResponse = z.infer<typeof WorkableCreateCommentResponse>;

export const EducationEntry = z.object({
  school: z.string(),
  degree: z.string(),
  field_of_study: z.string(),
  start_date: z.string(),
  end_date: z.string()
});

export type EducationEntry = z.infer<typeof EducationEntry>;

export const ExperienceEntry = z.object({
  title: z.string(),
  summary: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  current: z.boolean(),
  company: z.string(),
  industry: z.string()
});

export type ExperienceEntry = z.infer<typeof ExperienceEntry>;

export const Answer = z.object({
  question_key: z.string(),
  body: z.string(),
  choices: z.string().array(),
  checked: z.boolean(),
  date: z.string(),
  number: z.number(),

  file: z.object({
    name: z.string(),
    data: z.string()
  })
});

export type Answer = z.infer<typeof Answer>;

export const SocialProfile = z.object({
  type: z.string(),
  name: z.string(),
  username: z.string(),
  url: z.string()
});

export type SocialProfile = z.infer<typeof SocialProfile>;

export const WorkableCreateCandidateInput = z.object({
  shortcode: z.string(),

  candidate: z.object({
    name: z.string(),
    firstname: z.string(),
    lastname: z.string(),
    email: z.string(),
    headline: z.string(),
    summary: z.string(),
    address: z.string(),
    phone: z.string(),
    cover_letter: z.string(),
    education_entries: EducationEntry.array(),
    experience_entries: ExperienceEntry.array(),
    answers: Answer.array(),
    skills: z.string().array(),
    tags: z.string().array(),
    disqualified: z.boolean(),
    disqualification_reason: z.string(),
    disqualified_at: z.string(),
    social_profiles: SocialProfile.array()
  }),

  domain: z.string(),
  recruiter_key: z.string()
});

export type WorkableCreateCandidateInput = z.infer<typeof WorkableCreateCandidateInput>;

export const Attachment = z.object({
  name: z.string(),
  data: z.string()
});

export type Attachment = z.infer<typeof Attachment>;

export const WorkableCreateCommentInput = z.object({
  id: z.string(),
  member_id: z.string(),

  comment: z.object({
    body: z.string(),
    policy: z.string().array(),
    attachment: Attachment
  })
});

export type WorkableCreateCommentInput = z.infer<typeof WorkableCreateCommentInput>;

export const models = {
  WorkableCandidate: WorkableCandidate,
  WorkableJobsCandidate: WorkableJobsCandidate,
  WorkableCandidateActivity: WorkableCandidateActivity,
  WorkableCandidateOffer: WorkableCandidateOffer,
  WorkableJob: WorkableJob,
  WorkableJobQuestion: WorkableJobQuestion,
  WorkableMember: WorkableMember,
  WorkableCreateCandidateResponse: WorkableCreateCandidateResponse,
  WorkableCreateCommentResponse: WorkableCreateCommentResponse,
  EducationEntry: EducationEntry,
  ExperienceEntry: ExperienceEntry,
  Answer: Answer,
  SocialProfile: SocialProfile,
  WorkableCreateCandidateInput: WorkableCreateCandidateInput,
  Attachment: Attachment,
  WorkableCreateCommentInput: WorkableCreateCommentInput
};