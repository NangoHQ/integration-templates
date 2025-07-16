import { z } from "zod";

export const Email = z.object({
  email_address: z.string(),
  is_primary: z.boolean()
});

export type Email = z.infer<typeof Email>;

export const EducationInfo = z.object({
  school: z.union([z.string(), z.null()]).optional(),
  parsed_university: z.union([z.string(), z.null()]),
  parsed_school: z.union([z.string(), z.null()]),
  start_date: z.union([z.string(), z.null()]),
  end_date: z.union([z.string(), z.null()]),
  field_of_study: z.union([z.string(), z.null()]),
  parsed_major_1: z.union([z.string(), z.null()]),
  parsed_major_2: z.union([z.string(), z.null()]),
  degree: z.union([z.string(), z.null()])
});

export type EducationInfo = z.infer<typeof EducationInfo>;

export const WorkInfo = z.object({
  company: z.union([z.string(), z.null()]),
  title: z.union([z.string(), z.null()]),
  work_start_date: z.union([z.string(), z.null()]),
  work_end_date: z.union([z.string(), z.null()]),
  is_current: z.union([z.boolean(), z.null()])
});

export type WorkInfo = z.infer<typeof WorkInfo>;

export const CustomFieldCandidateInput = z.object({
  custom_field_id: z.string(),
  value: z.string()
});

export type CustomFieldCandidateInput = z.infer<typeof CustomFieldCandidateInput>;

export const CreateCandidateInput = z.object({
  created_by: z.string(),
  first_name: z.union([z.string(), z.null()]),
  last_name: z.union([z.string(), z.null()]),
  nickname: z.union([z.string(), z.null()]),
  emails: z.union([Email.array(), z.null()]),
  linked_in_handle: z.union([z.string(), z.null()]),
  title: z.union([z.string(), z.null()]),
  company: z.union([z.string(), z.null()]),
  location: z.union([z.string(), z.null()]),
  school: z.union([z.string(), z.null()]),
  education_info: z.union([EducationInfo.array(), z.null()]),
  work_info: z.union([WorkInfo.array(), z.null()]),
  profile_urls: z.union([z.string().array(), z.null()]),
  custom_fields: z.union([CustomFieldCandidateInput.array(), z.null()]),
  phone_number: z.union([z.string(), z.null()]),
  project_ids: z.union([z.string().array(), z.null()]),
  sourced_from: z.union([z.string(), z.null()]),
  autofill: z.boolean()
});

export type CreateCandidateInput = z.infer<typeof CreateCandidateInput>;

export const UpdateApplicationInput = z.object({
  source_id: z.string(),
  application_id: z.string()
});

export type UpdateApplicationInput = z.infer<typeof UpdateApplicationInput>;

export const UploadResumeInput = z.object({
  candidate_id: z.string(),
  user_id: z.string(),
  resume_file: z.string()
});

export type UploadResumeInput = z.infer<typeof UploadResumeInput>;

export const UploadResumeResponse = z.object({
  id: z.string(),
  candidate_id: z.string(),
  created_at: z.number(),
  user_id: z.string(),
  filename: z.string(),
  download_url: z.string()
});

export type UploadResumeResponse = z.infer<typeof UploadResumeResponse>;

export const CreateNoteParams = z.object({
  user_id: z.string(),
  body: z.string(),
  visibility: z.union([z.literal("private"), z.literal("public")]),
  candidate_id: z.string()
});

export type CreateNoteParams = z.infer<typeof CreateNoteParams>;

export const Note = z.object({
  id: z.string(),
  created_at: z.string(),
  body: z.string(),

  user: z.object({
    id: z.string(),
    name: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    employee_id: z.string()
  }),

  "private": z.boolean(),
  visibility: z.union([z.literal("public"), z.literal("private")])
});

export type Note = z.infer<typeof Note>;

export const CustomFieldCandidateOutput = z.object({
  id: z.string(),
  name: z.string(),
  scope: z.string(),
  project_id: z.string().optional(),
  value: z.any(),
  value_type: z.string(),
  value_option_ids: z.string().optional().array(),
  custom_field_category: z.string().optional(),
  custom_field_value: z.any().optional()
});

export type CustomFieldCandidateOutput = z.infer<typeof CustomFieldCandidateOutput>;

export const File = z.object({
  filename: z.string(),
  url: z.string(),
  type: z.string(),
  created_at: z.string()
});

export type File = z.infer<typeof File>;

export const PhoneNumber = z.object({
  type: z.string(),
  value: z.string()
});

export type PhoneNumber = z.infer<typeof PhoneNumber>;

export const EmailAddress = z.object({
  type: z.string(),
  value: z.string(),
  is_primary: z.boolean()
});

export type EmailAddress = z.infer<typeof EmailAddress>;

export const SocialMediaAddress = z.object({
  value: z.string()
});

export type SocialMediaAddress = z.infer<typeof SocialMediaAddress>;

export const Education = z.object({
  id: z.string(),
  school_name: z.string(),
  degree: z.string(),
  discipline: z.string(),
  start_date: z.string(),
  end_date: z.string()
});

export type Education = z.infer<typeof Education>;

export const GemWork = z.object({
  id: z.string(),
  company_name: z.string(),
  title: z.string(),
  start_date: z.string(),
  end_date: z.string()
});

export type GemWork = z.infer<typeof GemWork>;

export const ApplicationSource = z.object({
  id: z.string(),
  public_name: z.string()
});

export type ApplicationSource = z.infer<typeof ApplicationSource>;

export const RejectionReasonType = z.object({
  id: z.string(),
  name: z.string()
});

export type RejectionReasonType = z.infer<typeof RejectionReasonType>;

export const RejectionReason = z.object({
  id: z.string(),
  name: z.string(),
  type: RejectionReasonType
});

export type RejectionReason = z.infer<typeof RejectionReason>;

export const JobLite = z.object({
  id: z.string(),
  name: z.string()
});

export type JobLite = z.infer<typeof JobLite>;

export const JobStageLite = z.object({
  id: z.string(),
  name: z.string()
});

export type JobStageLite = z.infer<typeof JobStageLite>;

export const Application = z.object({
  id: z.string(),
  candidate_id: z.string(),
  applied_at: z.string(),
  rejected_at: z.union([z.string(), z.null()]),
  last_activity_at: z.string(),
  source: ApplicationSource,
  credited_to: z.string(),
  rejection_reason: z.union([RejectionReason, z.null()]),
  jobs: JobLite.array(),
  job_post_id: z.string(),
  status: z.string(),
  current_stage: JobStageLite,
  deleted_at: z.union([z.string(), z.null()])
});

export type Application = z.infer<typeof Application>;

export const Candidate = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  company: z.union([z.string(), z.null()]),
  title: z.union([z.string(), z.null()]),
  attachments: File.array(),
  phone_numbers: PhoneNumber.array(),
  email_addresses: EmailAddress.array(),
  social_media_addresses: SocialMediaAddress.array(),
  tags: z.string().array(),
  educations: Education.array(),
  employments: GemWork.array(),
  linked_user_ids: z.string().array(),
  created_at: z.string(),
  updated_at: z.union([z.string(), z.null()]),
  last_activity: z.union([z.string(), z.null()]),
  deleted_at: z.union([z.string(), z.null()]),
  is_private: z.boolean(),
  applications: Application.array(),
  application_ids: z.string().array()
});

export type Candidate = z.infer<typeof Candidate>;

export const Profile = z.object({
  network: z.string(),
  url: z.string(),
  username: z.string()
});

export type Profile = z.infer<typeof Profile>;

export const DueDate = z.object({
  date: z.string(),
  user_id: z.string(),
  note: z.union([z.string(), z.null()])
});

export type DueDate = z.infer<typeof DueDate>;

export const CreateCandidateOutput = z.object({
  id: z.string(),
  created_at: z.number(),
  created_by: z.string(),
  last_updated_at: z.union([z.number(), z.null()]),
  candidate_greenhouse_id: z.union([z.string(), z.null()]),
  first_name: z.union([z.string(), z.null()]),
  last_name: z.union([z.string(), z.null()]),
  nickname: z.union([z.string(), z.null()]),
  weblink: z.string(),
  emails: Email.array(),
  phone_number: z.union([z.string(), z.null()]),
  location: z.union([z.string(), z.null()]),
  linked_in_handle: z.union([z.string(), z.null()]),
  profiles: Profile.array(),
  company: z.union([z.string(), z.null()]),
  title: z.union([z.string(), z.null()]),
  school: z.union([z.string(), z.null()]),
  education_info: EducationInfo.array(),
  work_info: WorkInfo.array(),
  custom_fields: CustomFieldCandidateOutput.array(),
  due_date: z.union([DueDate, z.null()]),
  project_ids: z.union([z.string().array(), z.null()]),
  sourced_from: z.union([z.string(), z.null()]),
  gem_source: z.union([z.string(), z.null()])
});

export type CreateCandidateOutput = z.infer<typeof CreateCandidateOutput>;

export const JobPost = z.object({
  id: z.string(),
  title: z.string(),
  active: z.boolean(),
  live: z.boolean(),
  first_published_at: z.union([z.string(), z.null()]),
  job_id: z.string(),
  content: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.union([z.string(), z.null()])
});

export type JobPost = z.infer<typeof JobPost>;

export const UserLite = z.object({
  id: z.string(),
  name: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  employee_id: z.string()
});

export type UserLite = z.infer<typeof UserLite>;

export const QuestionLite = z.object({
  id: z.string(),
  name: z.string()
});

export type QuestionLite = z.infer<typeof QuestionLite>;

export const InterviewKit = z.object({
  id: z.string(),
  content: z.string(),
  questions: QuestionLite.array()
});

export type InterviewKit = z.infer<typeof InterviewKit>;

export const InterviewDefinition = z.object({
  id: z.string(),
  name: z.string(),
  schedulable: z.boolean(),
  estimated_minutes: z.number(),
  default_interviewer_users: UserLite.array(),
  interview_kit: InterviewKit,
  deleted_at: z.union([z.string(), z.null()]),
  job_stage_interview_item_id: z.string()
});

export type InterviewDefinition = z.infer<typeof InterviewDefinition>;

export const JobStage = z.object({
  id: z.string(),
  name: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.union([z.string(), z.null()]),
  active: z.boolean(),
  job_id: z.string(),
  priority: z.number(),
  interviews: InterviewDefinition.array()
});

export type JobStage = z.infer<typeof JobStage>;

export const Location = z.object({
  id: z.string(),
  name: z.string(),

  location: z.object({
    name: z.string()
  }),

  parent_id: z.string(),
  child_ids: z.string().array(),
  parent_office_external_id: z.string(),
  child_office_external_ids: z.string().array(),
  deleted_at: z.string()
});

export type Location = z.infer<typeof Location>;

export const Department = z.object({
  id: z.string(),
  name: z.string(),
  parent_id: z.string(),
  child_ids: z.string().array(),
  parent_department_external_id: z.string(),
  child_department_external_ids: z.string().array(),
  deleted_at: z.string()
});

export type Department = z.infer<typeof Department>;

export const User = z.object({
  id: z.string(),
  name: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  employee_id: z.string(),
  primary_email_address: z.string(),
  updated_at: z.string(),
  created_at: z.string(),
  disabled: z.boolean(),
  site_admin: z.boolean(),
  emails: z.string().array(),
  linked_candidate_ids: z.string().array(),
  offices: Location.array(),
  departments: Department.array(),
  deleted_at: z.union([z.string(), z.null()])
});

export type User = z.infer<typeof User>;

export const JobHiringTeam = z.object({
  hiring_managers: z.union([UserLite.array(), z.null()]),
  recruiters: z.union([UserLite.array(), z.null()]),
  coordinators: z.union([UserLite.array(), z.null()]),
  sourcers: z.union([UserLite.array(), z.null()])
});

export type JobHiringTeam = z.infer<typeof JobHiringTeam>;

export const Job = z.object({
  id: z.string(),
  name: z.string(),
  requisition_id: z.string(),
  confidential: z.boolean(),
  status: z.string(),
  created_at: z.string(),
  opened_at: z.string(),
  closed_at: z.union([z.string(), z.null()]),
  deleted_at: z.union([z.string(), z.null()]),
  updated_at: z.string(),
  is_template: z.boolean(),
  departments: Department.array(),
  offices: Location.array(),
  hiring_team: JobHiringTeam
});

export type Job = z.infer<typeof Job>;

export const TeamMemberUser = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string()
});

export type TeamMemberUser = z.infer<typeof TeamMemberUser>;

export const models = {
  Email: Email,
  EducationInfo: EducationInfo,
  WorkInfo: WorkInfo,
  CustomFieldCandidateInput: CustomFieldCandidateInput,
  CreateCandidateInput: CreateCandidateInput,
  UpdateApplicationInput: UpdateApplicationInput,
  UploadResumeInput: UploadResumeInput,
  UploadResumeResponse: UploadResumeResponse,
  CreateNoteParams: CreateNoteParams,
  Note: Note,
  CustomFieldCandidateOutput: CustomFieldCandidateOutput,
  File: File,
  PhoneNumber: PhoneNumber,
  EmailAddress: EmailAddress,
  SocialMediaAddress: SocialMediaAddress,
  Education: Education,
  GemWork: GemWork,
  ApplicationSource: ApplicationSource,
  RejectionReasonType: RejectionReasonType,
  RejectionReason: RejectionReason,
  JobLite: JobLite,
  JobStageLite: JobStageLite,
  Application: Application,
  Candidate: Candidate,
  Profile: Profile,
  DueDate: DueDate,
  CreateCandidateOutput: CreateCandidateOutput,
  JobPost: JobPost,
  UserLite: UserLite,
  QuestionLite: QuestionLite,
  InterviewKit: InterviewKit,
  InterviewDefinition: InterviewDefinition,
  JobStage: JobStage,
  Location: Location,
  Department: Department,
  User: User,
  JobHiringTeam: JobHiringTeam,
  Job: Job,
  TeamMemberUser: TeamMemberUser
};