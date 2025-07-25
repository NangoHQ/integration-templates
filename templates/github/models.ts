import { z } from "zod";

export const GithubIssue = z.object({
  id: z.string(),
  owner: z.string(),
  repo: z.string(),
  issue_number: z.number(),
  title: z.string(),
  author: z.string(),
  author_id: z.string(),
  state: z.string(),
  date_created: z.date(),
  date_last_modified: z.date(),
  body: z.string()
});

export type GithubIssue = z.infer<typeof GithubIssue>;

export const Issue = z.object({
  id: z.string(),
  owner: z.string(),
  repo: z.string(),
  issue_number: z.number(),
  title: z.string(),
  author: z.string(),
  author_id: z.string(),
  state: z.string(),
  date_created: z.date(),
  date_last_modified: z.date(),
  body: z.string()
});

export type Issue = z.infer<typeof Issue>;

export const GithubIssueRepoInput = z.object({
  owner: z.string(),
  repo: z.string(),
  branch: z.string()
});

export type GithubIssueRepoInput = z.infer<typeof GithubIssueRepoInput>;

export const Repo = z.object({
    id: z.number(),
    owner: z.string(),
    name: z.string(),
    full_name: z.string(),
    description: z.string(),
    url: z.string(),
    date_created: z.date(),
    date_last_modified: z.date()
});

export type Repo = z.infer<typeof Repo>;

export const GithubRepo = z.object({
    repos: z.array(z.object({
      id: z.number(),
      owner: z.string(),
      name: z.string(),
      full_name: z.string(),
      description: z.string(),
      url: z.string(),
      date_created: z.date(),
      date_last_modified: z.date()
    }))
});

export type GithubRepo = z.infer<typeof GithubRepo>;

export const GithubRepoFile = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  last_modified_date: z.date()
});

export type GithubRepoFile = z.infer<typeof GithubRepoFile>;

export const GithubWriteFileInput = z.object({
  owner: z.string(),
  repo: z.string(),
  path: z.string(),
  message: z.string(),
  content: z.string(),
  sha: z.string()
});

export type GithubWriteFileInput = z.infer<typeof GithubWriteFileInput>;

export const GithubWriteFileActionResult = z.object({
  url: z.string(),
  status: z.string(),
  sha: z.string()
});

export type GithubWriteFileActionResult = z.infer<typeof GithubWriteFileActionResult>;

export const models = {
  GithubIssue: GithubIssue,
  Issue: Issue,
  GithubIssueRepoInput: GithubIssueRepoInput,
  GithubRepo: GithubRepo,
  GithubRepoFile: GithubRepoFile,
  GithubWriteFileInput: GithubWriteFileInput,
  GithubWriteFileActionResult: GithubWriteFileActionResult
};
