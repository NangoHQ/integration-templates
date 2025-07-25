import { z } from "zod";

export const Timestamps = z.object({
  created_at: z.string(),
  updated_at: z.string()
});

export type Timestamps = z.infer<typeof Timestamps>;
export const UtilityAnyType = z.object({}).catchall(z.any());
export type UtilityAnyType = z.infer<typeof UtilityAnyType>;

export const Location = z.object({
  city: z.string().optional(),
  country: z.string(),
  state: z.string().optional()
});

export type Location = z.infer<typeof Location>;

export const Candidate = z.object({
  id: z.string(),
  object: z.string(),
  uri: z.string(),
  first_name: z.string(),
  middle_name: z.union([z.string(), z.null()]),
  last_name: z.string(),
  mother_maiden_name: z.string(),
  email: z.string(),
  phone: z.number(),
  zipcode: z.number(),
  dob: z.string(),
  ssn: z.string(),
  driver_license_number: z.string(),
  driver_license_state: z.string(),
  previous_driver_license_number: z.string(),
  previous_driver_license_state: z.string(),
  copy_requested: z.boolean(),
  custom_id: z.string(),
  report_ids: z.string().array(),
  geo_ids: z.string().array(),
  adjudication: z.string(),
  metadata: UtilityAnyType
});

export type Candidate = z.infer<typeof Candidate>;

export const CreateCandidate = z.object({
  city: z.string().optional(),
  country: z.string(),
  state: z.string().optional(),
  first_name: z.string(),
  middle_name: z.string().optional(),
  no_middle_name: z.boolean().optional(),
  last_name: z.string(),
  email: z.string(),
  phone: z.string(),
  zipcode: z.string(),
  dob: z.string(),
  ssn: z.string(),
  driver_license_number: z.string(),
  driver_license_state: z.string(),
  work_locations: Location.array()
});

export type CreateCandidate = z.infer<typeof CreateCandidate>;

export const BackgroundCheck = z.object({
  id: z.string(),
  status: z.string(),
  service_key: z.string(),
  url: z.string(),
  candidate_id: z.string(),
  created_at: z.string(),
  expires_at: z.string().optional()
});

export type BackgroundCheck = z.infer<typeof BackgroundCheck>;

export const CheckrTriggeredBackgroundCheck = z.object({
  created_at: z.string(),
  updated_at: z.string(),
  id: z.string(),
  object: z.string(),
  uri: z.string(),
  invitation_url: z.string(),
  status: z.string(),
  completed_at: z.union([z.string(), z.null()]),
  deleted_at: z.union([z.string(), z.null()]),
  "package": z.string(),
  candidate_id: z.string(),
  report_id: z.union([z.string(), z.null()]),
  archived: z.boolean(),
  expires_at: z.string().optional(),

  archived_info: z.object({
    time: z.string(),

    user: z.object({
      email: z.string(),
      id: z.string()
    })
  })
});

export type CheckrTriggeredBackgroundCheck = z.infer<typeof CheckrTriggeredBackgroundCheck>;

export const BackgroundCheckParametersInput = z.object({
  service_key: z.string()
});

export type BackgroundCheckParametersInput = z.infer<typeof BackgroundCheckParametersInput>;

export const TriggeredBackgroundCheck = z.object({
  created_at: z.string(),
  updated_at: z.string(),
  applicationId: z.any(),
  url: z.string(),
  status: z.string(),
  completed_at: z.union([z.string(), z.null()]),
  candidate_id: z.string(),
  service_key: z.string(),
  deleted_at: z.union([z.string(), z.null()])
});

export type TriggeredBackgroundCheck = z.infer<typeof TriggeredBackgroundCheck>;

export const TriggerBackgroundCheckInput = z.object({
  city: z.string().optional(),
  country: z.string(),
  state: z.string().optional(),
  service_key: z.string(),
  candidate_id: z.string(),
  node: z.string().optional(),
  tags: z.string().optional().array()
});

export type TriggerBackgroundCheckInput = z.infer<typeof TriggerBackgroundCheckInput>;

export const BackgroundCheckParameters = z.object({
  key: z.string(),
  type: z.string(),
  title: z.string(),
  description: z.string(),
  required: z.boolean()
});

export type BackgroundCheckParameters = z.infer<typeof BackgroundCheckParameters>;

export const BackgroundCheckParameterResponse = z.object({
  parameters: BackgroundCheckParameters.array()
});

export type BackgroundCheckParameterResponse = z.infer<typeof BackgroundCheckParameterResponse>;

export const CheckrScreening = z.object({
  type: z.string(),
  subtype: z.union([z.string(), z.null()])
});

export type CheckrScreening = z.infer<typeof CheckrScreening>;

export const CheckrService = z.object({
  id: z.string(),
  price: z.number(),
  drug_screening_price: z.union([z.number(), z.null()]),
  enabled_examples: z.string().array(),
  requires_observed_drug_test: z.boolean(),
  object: z.string(),
  apply_url: z.string(),
  created_at: z.string(),
  deleted_at: z.union([z.string(), z.null()]),
  name: z.string(),
  screenings: CheckrScreening.array(),
  slug: z.string(),
  uri: z.string(),
  node: z.string().optional()
});

export type CheckrService = z.infer<typeof CheckrService>;

export const CheckrServicesResponse = z.object({
  services: CheckrService.array()
});

export type CheckrServicesResponse = z.infer<typeof CheckrServicesResponse>;

export const models = {
  Timestamps: Timestamps,
  UtilityAnyType: UtilityAnyType,
  Location: Location,
  Candidate: Candidate,
  CreateCandidate: CreateCandidate,
  BackgroundCheck: BackgroundCheck,
  CheckrTriggeredBackgroundCheck: CheckrTriggeredBackgroundCheck,
  BackgroundCheckParametersInput: BackgroundCheckParametersInput,
  TriggeredBackgroundCheck: TriggeredBackgroundCheck,
  TriggerBackgroundCheckInput: TriggerBackgroundCheckInput,
  BackgroundCheckParameters: BackgroundCheckParameters,
  BackgroundCheckParameterResponse: BackgroundCheckParameterResponse,
  CheckrScreening: CheckrScreening,
  CheckrService: CheckrService,
  CheckrServicesResponse: CheckrServicesResponse
};