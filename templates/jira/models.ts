import { z } from "zod";

export const JiraProjectId = z.object({
  id: z.string()
});

export type JiraProjectId = z.infer<typeof JiraProjectId>;

export const JiraIssueMetadata = z.object({
  projectIdsToSync: JiraProjectId.array(),
  cloudId: z.string().optional(),
  baseUrl: z.string().optional(),
  timeZone: z.string().optional(),
});

export type JiraIssueMetadata = z.infer<typeof JiraIssueMetadata>;

export const Timestamps = z.object({
  createdAt: z.string(),
  updatedAt: z.string()
});

export type Timestamps = z.infer<typeof Timestamps>;

export const Author = z.object({
  accountId: z.union([z.string(), z.null()]),
  active: z.boolean(),
  displayName: z.string(),
  emailAddress: z.union([z.string(), z.null()])
});

export type Author = z.infer<typeof Author>;

export const Comment = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: Author,
  body: z.object({})
});

export type Comment = z.infer<typeof Comment>;

export const Issue = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  key: z.string(),
  summary: z.string(),
  issueType: z.string(),
  status: z.string(),
  assignee: z.union([z.string(), z.null()]),
  url: z.string(),
  webUrl: z.string(),
  projectId: z.string(),
  projectKey: z.string(),
  projectName: z.string(),
  comments: z.array(Comment)
});

export type Issue = z.infer<typeof Issue>;

export const Project = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  url: z.string(),
  projectTypeKey: z.string(),
  webUrl: z.string()
});

export type Project = z.infer<typeof Project>;

export const IssueType = z.object({
  projectId: z.string(),
  id: z.string(),
  name: z.string(),
  description: z.union([z.string(), z.null()]),
  url: z.string()
});

export type IssueType = z.infer<typeof IssueType>;

export const CreateIssueInput = z.object({
  summary: z.string(),
  description: z.string().optional(),
  assignee: z.string().optional(),
  labels: z.string().array().optional(),
  project: z.string(),
  issueType: z.string()
});

export type CreateIssueInput = z.infer<typeof CreateIssueInput>;

export const CreateIssueOutput = z.object({
  id: z.string(),
  key: z.string(),
  self: z.string()
});

export type CreateIssueOutput = z.infer<typeof CreateIssueOutput>;

export const models = {
  JiraProjectId: JiraProjectId,
  JiraIssueMetadata: JiraIssueMetadata,
  Timestamps: Timestamps,
  Author: Author,
  Comment: Comment,
  Issue: Issue,
  Project: Project,
  IssueType: IssueType,
  CreateIssueInput: CreateIssueInput,
  CreateIssueOutput: CreateIssueOutput
};
