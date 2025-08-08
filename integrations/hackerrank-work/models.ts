import { z } from "zod";

export const CandidateInformation = z.object({
  name: z.string(),
  email: z.string()
});

export type CandidateInformation = z.infer<typeof CandidateInformation>;

export const HackerRankWorkInterview = z.object({
  id: z.string(),
  status: z.string(),
  created_at: z.date(),
  updated_at: z.date(),
  title: z.string(),
  feedback: z.string(),
  notes: z.string(),
  metadata: z.object({}),
  quickpad: z.boolean(),
  ended_at: z.date(),
  timezone: z.string(),
  interview_template_id: z.string(),
  from: z.date(),
  to: z.date(),
  url: z.string(),
  user: z.string(),
  thumbs_up: z.boolean(),
  resume_url: z.string(),
  interviewers: z.string().array(),
  candidate: CandidateInformation,
  result_url: z.string(),
  report_url: z.string()
});

export type HackerRankWorkInterview = z.infer<typeof HackerRankWorkInterview>;

export const HackerRankWorkCreateInterviewInput = z.object({
  id: z.string(),
  status: z.string(),
  created_at: z.date(),
  updated_at: z.date(),
  title: z.string(),
  feedback: z.string(),
  notes: z.string(),
  metadata: z.object({}),
  quickpad: z.boolean(),
  ended_at: z.date(),
  timezone: z.string(),
  interview_template_id: z.string(),
  from: z.date(),
  to: z.date(),
  url: z.string(),
  user: z.string(),
  thumbs_up: z.boolean(),
  resume_url: z.string(),
  interviewers: z.string().array(),
  candidate: CandidateInformation,
  result_url: z.string(),
  report_url: z.string(),
  send_email: z.boolean(),
  interview_metadata: z.object({})
});

export type HackerRankWorkCreateInterviewInput = z.infer<typeof HackerRankWorkCreateInterviewInput>;

export const HackerRankWorkTeam = z.object({
  id: z.string(),
  name: z.string(),
  owner: z.string(),
  created_at: z.date(),
  recruiter_count: z.number(),
  developer_count: z.number(),
  interviewer_count: z.number(),
  recruiter_cap: z.number(),
  developer_cap: z.number(),
  interviewer_cap: z.number(),
  logo_id: z.string(),
  library_access: z.boolean(),
  invite_as: z.string(),
  locations: z.string().array(),
  departments: z.string().array()
});

export type HackerRankWorkTeam = z.infer<typeof HackerRankWorkTeam>;

export const HackerRankWorkTest = z.object({
  id: z.string(),
  unique_id: z.string(),
  name: z.string(),
  duration: z.number(),
  owner: z.string(),
  instructions: z.string(),
  created_at: z.date(),
  state: z.string(),
  locked: z.boolean(),
  test_type: z.string(),
  starred: z.boolean(),
  start_time: z.date(),
  end_time: z.date(),
  draft: z.boolean(),
  questions: z.string().array(),
  sections: z.object({}),
  tags: z.string().array(),
  permission: z.number()
});

export type HackerRankWorkTest = z.infer<typeof HackerRankWorkTest>;

export const HackerRankWorkUser = z.object({
  id: z.string(),
  email: z.string(),
  firstname: z.string(),
  lastname: z.string(),
  country: z.string(),
  role: z.string(),
  status: z.string(),
  phone: z.string(),
  timezone: z.string(),
  questions_permission: z.number(),
  tests_permission: z.number(),
  interviews_permission: z.number(),
  candidates_permission: z.number(),
  shared_questions_permission: z.number(),
  shared_tests_permission: z.number(),
  shared_interviews_permission: z.number(),
  shared_candidates_permission: z.number(),
  created_at: z.date(),
  company_admin: z.boolean(),
  team_admin: z.boolean(),
  company_id: z.string(),
  teams: z.any().array(),
  activated: z.boolean(),
  last_activity_time: z.date()
});

export type HackerRankWorkUser = z.infer<typeof HackerRankWorkUser>;

export const HackerRankWorkCreateTestInput = z.object({
  name: z.string(),
  starttime: z.date(),
  endtime: z.date(),
  duration: z.number(),
  instructions: z.string(),
  locked: z.boolean(),
  draft: z.string(),
  languages: z.string().array(),
  candidate_details: z.string().array(),
  custom_acknowledge_text: z.string(),
  cutoff_score: z.number(),
  master_password: z.string(),
  hide_compile_test: z.boolean(),
  tags: z.string().array(),
  role_ids: z.string().array(),
  experience: z.string().array(),
  questions: z.string().array(),
  mcq_incorrect_score: z.number(),
  mcq_correct_score: z.number(),
  secure: z.boolean(),
  shuffle_questions: z.boolean(),
  test_admins: z.string().array(),
  hide_template: z.boolean(),
  enable_acknowledgement: z.boolean(),
  enable_proctoring: z.boolean(),
  candidate_tab_switch: z.boolean(),
  track_editor_paste: z.boolean(),
  show_copy_paste_prompt: z.boolean(),
  ide_config: z.string()
});

export type HackerRankWorkCreateTestInput = z.infer<typeof HackerRankWorkCreateTestInput>;

export const models = {
  CandidateInformation: CandidateInformation,
  HackerRankWorkInterview: HackerRankWorkInterview,
  HackerRankWorkCreateInterviewInput: HackerRankWorkCreateInterviewInput,
  HackerRankWorkTeam: HackerRankWorkTeam,
  HackerRankWorkTest: HackerRankWorkTest,
  HackerRankWorkUser: HackerRankWorkUser,
  HackerRankWorkCreateTestInput: HackerRankWorkCreateTestInput
};