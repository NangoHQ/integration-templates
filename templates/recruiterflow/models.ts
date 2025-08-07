import { z } from "zod";

export const RecruiterFlowUser = z.object({
  id: z.string(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role: z.string().array().optional(),
  img_link: z.union([z.string(), z.null()])
});

export type RecruiterFlowUser = z.infer<typeof RecruiterFlowUser>;

export const RecruiterFlowResumeLink = z.object({
  filename: z.string(),
  link: z.string()
});

export type RecruiterFlowResumeLink = z.infer<typeof RecruiterFlowResumeLink>;

export const RecruiterFlowAssociatedJob = z.object({
  job_id: z.number(),
  job_name: z.string(),
  client_company_name: z.union([z.string(), z.null()]),
  current_stage_name: z.string(),
  is_open: z.boolean()
});

export type RecruiterFlowAssociatedJob = z.infer<typeof RecruiterFlowAssociatedJob>;
export const RecruiterFlowCustomFields = z.object({}).catchall(z.union([z.string(), z.number()]));
export type RecruiterFlowCustomFields = z.infer<typeof RecruiterFlowCustomFields>;

export const RecruiterFlowCandidate = z.object({
  id: z.string(),
  full_name: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  profile_picture_link: z.string().optional(),
  added_by_name: z.string(),
  added_by_id: z.number(),
  added_time: z.string(),
  latest_activity_time: z.string().optional(),
  last_contacted_time: z.string().optional(),
  email_addresses: z.string().array(),
  phone_numbers: z.string().array(),
  current_designation: z.string().optional(),
  current_organization: z.string().optional(),
  location_city: z.string().optional(),
  location_country: z.string().optional(),
  location_full_string: z.string().optional(),
  source: z.union([z.string(), z.null()]),
  status_name: z.string().optional(),
  linkedin_profile_url: z.string().optional(),
  github_profile_url: z.string().optional(),
  twitter_profile_url: z.string().optional(),
  angellist_profile_url: z.string().optional(),
  behance_profile_url: z.string().optional(),
  dribbble_profile_url: z.string().optional(),
  facebook_profile_url: z.string().optional(),
  xing_profile_url: z.string().optional(),
  resume_links: RecruiterFlowResumeLink.array().optional(),
  associated_jobs: RecruiterFlowAssociatedJob.array().optional(),
  custom_fields: RecruiterFlowCustomFields.array().optional()
});

export type RecruiterFlowCandidate = z.infer<typeof RecruiterFlowCandidate>;

export const RecruiterFlowCandidateActivityStageMovementInput = z.object({
  id: z.string(),
  after: z.string().optional(),
  before: z.string().optional()
});

export type RecruiterFlowCandidateActivityStageMovementInput = z.infer<typeof RecruiterFlowCandidateActivityStageMovementInput>;

export const RecruiterFlowTransitionUser = z.object({
  email: z.string(),
  id: z.number(),
  name: z.string()
});

export type RecruiterFlowTransitionUser = z.infer<typeof RecruiterFlowTransitionUser>;

export const RecruiterFlowTransition = z.object({
  entered: z.string(),
  from: z.union([z.string(), z.null()]),
  left: z.union([z.string(), z.null()]),
  stage_moved_by: RecruiterFlowTransitionUser,
  to: z.string()
});

export type RecruiterFlowTransition = z.infer<typeof RecruiterFlowTransition>;

export const RecruiterFlowJobWithTransitions = z.object({
  id: z.number(),
  name: z.string(),
  added_by: RecruiterFlowTransitionUser,
  transitions: RecruiterFlowTransition.array()
});

export type RecruiterFlowJobWithTransitions = z.infer<typeof RecruiterFlowJobWithTransitions>;

export const RecruiterFlowCandidateActivityStageMovementOutput = z.object({
  data: RecruiterFlowJobWithTransitions.array()
});

export type RecruiterFlowCandidateActivityStageMovementOutput = z.infer<typeof RecruiterFlowCandidateActivityStageMovementOutput>;

export const RecruiterFlowCandidateActivityStageMovement = z.object({
  id: z.number(),
  jobs: RecruiterFlowJobWithTransitions.array(),
  name: z.string()
});

export type RecruiterFlowCandidateActivityStageMovement = z.infer<typeof RecruiterFlowCandidateActivityStageMovement>;

export const RecruiterFlowCandidateActivityType = z.object({
  category: z.string(),
  id: z.string(),
  is_archived: z.boolean(),
  is_custom: z.boolean(),
  name: z.string(),
  rank: z.number(),
  track_last_contacted: z.boolean(),
  track_last_engaged: z.boolean()
});

export type RecruiterFlowCandidateActivityType = z.infer<typeof RecruiterFlowCandidateActivityType>;

export const RecruiterFlowCandidateActivityListInput = z.object({
  id: z.string()
});

export type RecruiterFlowCandidateActivityListInput = z.infer<typeof RecruiterFlowCandidateActivityListInput>;

export const RecruiterFlowLeanCandidate = z.object({
  id: z.number(),
  name: z.string(),
  first_name: z.string().optional()
});

export type RecruiterFlowLeanCandidate = z.infer<typeof RecruiterFlowLeanCandidate>;

export const RecruiterFlowLeanJob = z.object({
  id: z.number(),
  name: z.string()
});

export type RecruiterFlowLeanJob = z.infer<typeof RecruiterFlowLeanJob>;

export const RecruiterFlowCandidateActivityListAssociatedEntities = z.object({
  candidates: RecruiterFlowLeanCandidate.array(),
  clients: z.any().array(),
  contacts: z.any().array(),
  deals: z.any().array(),
  jobs: RecruiterFlowLeanJob.array(),
  placements: z.any().array()
});

export type RecruiterFlowCandidateActivityListAssociatedEntities = z.infer<typeof RecruiterFlowCandidateActivityListAssociatedEntities>;

export const RecruiterFlowCandidateActivityListType = z.object({
  id: z.number(),
  name: z.union([z.string(), z.null()])
});

export type RecruiterFlowCandidateActivityListType = z.infer<typeof RecruiterFlowCandidateActivityListType>;

export const RecruiterFlowCandidateActivityListCandidate = z.object({
  email: z.union([z.string(), z.null()]),
  first_name: z.union([z.string(), z.null()]),
  id: z.union([z.number(), z.null()]),
  last_name: z.union([z.string(), z.null()]),
  name: z.string()
});

export type RecruiterFlowCandidateActivityListCandidate = z.infer<typeof RecruiterFlowCandidateActivityListCandidate>;

export const RecruiterFlowCandidateFullActivity = z.object({
  activity_id: z.union([z.number(), z.null()]),
  associated_entities: z.union([RecruiterFlowCandidateActivityListAssociatedEntities, z.null()]).optional(),
  candidate_id: z.union([z.number(), z.null()]),
  contact_id: z.union([z.number(), z.null()]),
  interview_plan_id: z.union([z.number(), z.null()]),
  is_custom: z.boolean(),
  job_id: z.union([z.number(), z.null()]),
  subject: z.string(),
  text: z.string(),
  time: z.string(),
  type: RecruiterFlowCandidateActivityListType,
  user: RecruiterFlowCandidateActivityListCandidate
});

export type RecruiterFlowCandidateFullActivity = z.infer<typeof RecruiterFlowCandidateFullActivity>;

export const RecruiterFlowCandidateActivityListOutput = z.object({
  data: RecruiterFlowCandidateFullActivity.array()
});

export type RecruiterFlowCandidateActivityListOutput = z.infer<typeof RecruiterFlowCandidateActivityListOutput>;

export const RecruiterFlowScorecardAttributeCategory = z.object({
  name: z.string()
});

export type RecruiterFlowScorecardAttributeCategory = z.infer<typeof RecruiterFlowScorecardAttributeCategory>;

export const RecruiterFlowScorecardAttribute = z.object({
  category: RecruiterFlowScorecardAttributeCategory,
  name: z.string(),
  notes: z.string(),
  rank: z.number(),
  rating: z.number()
});

export type RecruiterFlowScorecardAttribute = z.infer<typeof RecruiterFlowScorecardAttribute>;

export const RecruiterFlowScorecardQuestion = z.object({
  category_name: z.string(),
  id: z.number(),
  response: z.string(),
  text: z.string()
});

export type RecruiterFlowScorecardQuestion = z.infer<typeof RecruiterFlowScorecardQuestion>;

export const RecruiterFlowScorecard = z.object({
  attributes: RecruiterFlowScorecardAttribute.array(),
  bottomline: z.string(),
  first_name: z.string(),
  id: z.number(),
  last_name: z.string(),
  middle_name: z.string(),
  name: z.string(),
  notes: z.string(),
  questions: RecruiterFlowScorecardQuestion.array(),
  result_id: z.number(),
  submission_time: z.string(),
  user_id: z.number()
});

export type RecruiterFlowScorecard = z.infer<typeof RecruiterFlowScorecard>;

export const RecruiterFlowScorecardStage = z.object({
  id: z.number(),
  name: z.string(),
  scorecard: RecruiterFlowScorecard.array()
});

export type RecruiterFlowScorecardStage = z.infer<typeof RecruiterFlowScorecardStage>;

export const RecruiterFlowScorecardJob = z.object({
  id: z.number(),
  name: z.string(),
  stages: RecruiterFlowScorecardStage.array()
});

export type RecruiterFlowScorecardJob = z.infer<typeof RecruiterFlowScorecardJob>;

export const RecruiterFlowCandidateScorecard = z.object({
  candidate: RecruiterFlowLeanCandidate,
  job: RecruiterFlowScorecardJob.array()
});

export type RecruiterFlowCandidateScorecard = z.infer<typeof RecruiterFlowCandidateScorecard>;

export const RecruiterFlowCandidateScorecardInput = z.object({
  id: z.string(),
  job_id: z.string()
});

export type RecruiterFlowCandidateScorecardInput = z.infer<typeof RecruiterFlowCandidateScorecardInput>;

export const RecruiterFlowJobLocation = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional()
});

export type RecruiterFlowJobLocation = z.infer<typeof RecruiterFlowJobLocation>;

export const RecruiterFlowJob = z.object({
  id: z.string(),
  title: z.string(),
  apply_link: z.string().optional(),
  company_name: z.string().optional(),
  company_logo_link: z.union([z.string(), z.null()]).optional(),
  locations: RecruiterFlowJobLocation.array(),
  department: z.string(),
  employment_type: z.string(),
  job_type_name: z.union([z.string(), z.null()]),
  experience_range_start: z.union([z.number(), z.null()]),
  experience_range_end: z.union([z.number(), z.null()]),
  is_open: z.boolean(),
  job_status_name: z.union([z.string(), z.null()]),
  number_of_openings: z.number(),
  salary_range_end: z.union([z.number(), z.null()]).optional(),
  salary_range_start: z.union([z.number(), z.null()]).optional(),
  salary_range_currency: z.string().optional(),
  salary_frequency: z.union([z.string(), z.null()]).optional(),
  pay_rate_number: z.string().optional(),
  pay_rate_currency: z.string().optional(),
  pay_rate_frequency_display_name: z.string().optional(),
  bill_rate_number: z.string().optional(),
  bill_rate_currency: z.string().optional(),
  bill_rate_frequency_display_name: z.string().optional(),
  contract_start_date: z.union([z.string(), z.null()]).optional(),
  contract_end_date: z.union([z.string(), z.null()]).optional(),
  work_quantum_number: z.string().optional(),
  work_quantum_unit_display_name: z.string().optional(),
  work_quantum_frequency_display_name: z.string().optional(),
  work_quantum_is_full_time: z.boolean().optional(),
  expected_salary_number: z.number().optional(),
  expected_salary_currency: z.string().optional(),
  expected_fee_number: z.number().optional(),
  expected_fee_currency: z.string().optional(),
  commission_rate: z.union([z.number(), z.null()]).optional(),
  expected_start_date: z.string().optional(),
  expected_end_date: z.string().optional(),
  custom_fields: RecruiterFlowCustomFields.array().optional(),
  files_links: z.string().array().optional()
});

export type RecruiterFlowJob = z.infer<typeof RecruiterFlowJob>;

export const RecruiterFlowJobPipelineSummary = z.object({
  id: z.number(),
  name: z.string(),
  count: z.number()
});

export type RecruiterFlowJobPipelineSummary = z.infer<typeof RecruiterFlowJobPipelineSummary>;

export const RecruiterFlowJobPipeline = z.object({
  detail: z.any().array(),
  summary: RecruiterFlowJobPipelineSummary.array()
});

export type RecruiterFlowJobPipeline = z.infer<typeof RecruiterFlowJobPipeline>;

export const RecruiterFlowLeanJobStageName = z.object({
  id: z.string(),
  name: z.string()
});

export type RecruiterFlowLeanJobStageName = z.infer<typeof RecruiterFlowLeanJobStageName>;

export const RecruiterFlowJobDepartment = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number()
});

export type RecruiterFlowJobDepartment = z.infer<typeof RecruiterFlowJobDepartment>;

export const RecruiterFlowJobStatus = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string()
});

export type RecruiterFlowJobStatus = z.infer<typeof RecruiterFlowJobStatus>;

export const RecruiterFlowJobRemoteStatus = z.object({
  id: z.string(),
  name: z.string()
});

export type RecruiterFlowJobRemoteStatus = z.infer<typeof RecruiterFlowJobRemoteStatus>;

export const RecruiterFlowLocation = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string().optional(),
  country: z.string().optional(),
  details: z.string().optional(),
  iso_3166_1_alpha_2_code: z.string().optional(),
  location_type: z.string(),
  location_type_id: z.number(),
  postal_code: z.string().optional(),
  state: z.string().optional(),
  zipcode: z.string().optional()
});

export type RecruiterFlowLocation = z.infer<typeof RecruiterFlowLocation>;

export const RecruiterFlowEmploymentType = z.object({
  id: z.string(),
  name: z.string()
});

export type RecruiterFlowEmploymentType = z.infer<typeof RecruiterFlowEmploymentType>;

export const RecruiterFlowOrganizationLocation = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional()
});

export type RecruiterFlowOrganizationLocation = z.infer<typeof RecruiterFlowOrganizationLocation>;
export const RecruiterFlowScores = z.object({}).catchall(z.number());
export type RecruiterFlowScores = z.infer<typeof RecruiterFlowScores>;

export const RecruiterFlowPipelineInput = z.object({
  job_id: z.string()
});

export type RecruiterFlowPipelineInput = z.infer<typeof RecruiterFlowPipelineInput>;

export const models = {
  RecruiterFlowUser: RecruiterFlowUser,
  RecruiterFlowResumeLink: RecruiterFlowResumeLink,
  RecruiterFlowAssociatedJob: RecruiterFlowAssociatedJob,
  RecruiterFlowCustomFields: RecruiterFlowCustomFields,
  RecruiterFlowCandidate: RecruiterFlowCandidate,
  RecruiterFlowCandidateActivityStageMovementInput: RecruiterFlowCandidateActivityStageMovementInput,
  RecruiterFlowTransitionUser: RecruiterFlowTransitionUser,
  RecruiterFlowTransition: RecruiterFlowTransition,
  RecruiterFlowJobWithTransitions: RecruiterFlowJobWithTransitions,
  RecruiterFlowCandidateActivityStageMovementOutput: RecruiterFlowCandidateActivityStageMovementOutput,
  RecruiterFlowCandidateActivityStageMovement: RecruiterFlowCandidateActivityStageMovement,
  RecruiterFlowCandidateActivityType: RecruiterFlowCandidateActivityType,
  RecruiterFlowCandidateActivityListInput: RecruiterFlowCandidateActivityListInput,
  RecruiterFlowLeanCandidate: RecruiterFlowLeanCandidate,
  RecruiterFlowLeanJob: RecruiterFlowLeanJob,
  RecruiterFlowCandidateActivityListAssociatedEntities: RecruiterFlowCandidateActivityListAssociatedEntities,
  RecruiterFlowCandidateActivityListType: RecruiterFlowCandidateActivityListType,
  RecruiterFlowCandidateActivityListCandidate: RecruiterFlowCandidateActivityListCandidate,
  RecruiterFlowCandidateFullActivity: RecruiterFlowCandidateFullActivity,
  RecruiterFlowCandidateActivityListOutput: RecruiterFlowCandidateActivityListOutput,
  RecruiterFlowScorecardAttributeCategory: RecruiterFlowScorecardAttributeCategory,
  RecruiterFlowScorecardAttribute: RecruiterFlowScorecardAttribute,
  RecruiterFlowScorecardQuestion: RecruiterFlowScorecardQuestion,
  RecruiterFlowScorecard: RecruiterFlowScorecard,
  RecruiterFlowScorecardStage: RecruiterFlowScorecardStage,
  RecruiterFlowScorecardJob: RecruiterFlowScorecardJob,
  RecruiterFlowCandidateScorecard: RecruiterFlowCandidateScorecard,
  RecruiterFlowCandidateScorecardInput: RecruiterFlowCandidateScorecardInput,
  RecruiterFlowJobLocation: RecruiterFlowJobLocation,
  RecruiterFlowJob: RecruiterFlowJob,
  RecruiterFlowJobPipelineSummary: RecruiterFlowJobPipelineSummary,
  RecruiterFlowJobPipeline: RecruiterFlowJobPipeline,
  RecruiterFlowLeanJobStageName: RecruiterFlowLeanJobStageName,
  RecruiterFlowJobDepartment: RecruiterFlowJobDepartment,
  RecruiterFlowJobStatus: RecruiterFlowJobStatus,
  RecruiterFlowJobRemoteStatus: RecruiterFlowJobRemoteStatus,
  RecruiterFlowLocation: RecruiterFlowLocation,
  RecruiterFlowEmploymentType: RecruiterFlowEmploymentType,
  RecruiterFlowOrganizationLocation: RecruiterFlowOrganizationLocation,
  RecruiterFlowScores: RecruiterFlowScores,
  RecruiterFlowPipelineInput: RecruiterFlowPipelineInput
};
