import { z } from "zod";

export const GreenhouseApplication = z.object({
  id: z.string(),
  candidate_id: z.string(),
  prospect: z.boolean(),
  applied_at: z.date(),
  rejected_at: z.date(),
  last_activity_at: z.date(),

  location: z.object({
    address: z.string()
  }),

  source: z.object({
    id: z.string(),
    public_name: z.string()
  }),

  credited_to: z.object({
    id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    name: z.string(),
    employee_id: z.string()
  }),

  rejection_reason: z.object({
    id: z.string(),
    name: z.string(),

    type: z.object({
      id: z.string(),
      name: z.string()
    })
  }),

  rejection_details: z.object({
    custom_fields: z.object({}),
    keyed_custom_fields: z.object({})
  }),

  jobs: z.string().array(),
  job_post_id: z.string(),
  status: z.string(),

  current_stage: z.object({
    id: z.string(),
    name: z.string()
  }),

  answers: z.string().array(),

  prospective_office: z.object({
    primary_contact_user_id: z.string(),
    parent_id: z.string(),
    name: z.string(),

    location: z.object({
      name: z.string()
    }),

    id: z.string(),
    external_id: z.string(),
    child_ids: z.string().array()
  }),

  prospective_department: z.object({
    parent_id: z.string(),
    name: z.string(),
    id: z.string(),
    external_id: z.string(),
    child_ids: z.string().array()
  }),

  prospect_detail: z.object({
    prospect_pool: z.object({
      id: z.string(),
      name: z.string()
    }),

    prospect_stage: z.object({
      id: z.string(),
      name: z.string()
    }),

    prospect_owner: z.object({
      id: z.string(),
      name: z.string()
    })
  }),

  custom_fields: z.object({}),
  keyed_custom_fields: z.object({}),
  attachments: z.any().array()
});

export type GreenhouseApplication = z.infer<typeof GreenhouseApplication>;

export const GreenhouseCandidate = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  company: z.string(),
  title: z.string(),
  created_at: z.date(),
  updated_at: z.date(),
  last_activity: z.date(),
  is_private: z.boolean(),
  photo_url: z.string(),
  attachments: z.any().array(),
  application_ids: z.string().array(),
  phone_numbers: z.string().array(),
  addresses: z.any().array(),
  email_addresses: z.string().array(),
  website_addresses: z.string().array(),
  social_media_addresses: z.string().array(),

  recruiter: z.object({
    id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    name: z.string(),
    employee_id: z.string()
  }),

  coordinator: z.object({
    id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    name: z.string(),
    employee_id: z.string()
  }),

  can_email: z.boolean(),
  tags: z.string().array(),
  applications: z.string().array(),
  educations: z.string().array(),
  employments: z.string().array(),
  linked_user_ids: z.string(),
  custom_fields: z.object({}),
  keyed_custom_fields: z.object({})
});

export type GreenhouseCandidate = z.infer<typeof GreenhouseCandidate>;

export const GreenhouseJob = z.object({
  id: z.string(),
  name: z.string(),
  requisition_id: z.string(),
  notes: z.string(),
  confidential: z.boolean(),
  status: z.string(),
  created_at: z.date(),
  opened_at: z.date(),
  closed_at: z.date(),
  updated_at: z.date(),
  is_template: z.boolean(),
  copied_from_id: z.string(),
  departments: z.string().array(),
  offices: z.string().array(),
  custom_fields: z.object({}),
  keyed_custom_fields: z.object({}),

  hiring_team: z.object({
    hiring_managers: z.string().array(),
    recruiters: z.string().array(),
    coordinators: z.string().array(),
    sourcers: z.string().array()
  }),

  openings: z.string().array()
});

export type GreenhouseJob = z.infer<typeof GreenhouseJob>;

export const models = {
  GreenhouseApplication: GreenhouseApplication,
  GreenhouseCandidate: GreenhouseCandidate,
  GreenhouseJob: GreenhouseJob
};