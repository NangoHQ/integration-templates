import { z } from "zod";

export const GithubLicense = z.object({
  key: z.string(),
  name: z.string(),
  url: z.union([z.string(), z.null()]),
  spdx_id: z.string(),
  node_id: z.string(),
  html_url: z.union([z.string(), z.null()]).optional()
});

export type GithubLicense = z.infer<typeof GithubLicense>;

export const Repository = z.object({
  allow_forking: z.boolean(),
  archive_url: z.string(),
  archived: z.boolean(),
  assignees_url: z.string(),
  blobs_url: z.string(),
  branches_url: z.string(),
  clone_url: z.string(),
  collaborators_url: z.string(),
  comments_url: z.string(),
  commits_url: z.string(),
  compare_url: z.string(),
  contents_url: z.string(),
  contributors_url: z.string(),
  created_at: z.string(),
  default_branch: z.string(),
  deployments_url: z.string(),
  description: z.union([z.string(), z.null()]),
  disabled: z.boolean(),
  downloads_url: z.string(),
  events_url: z.string(),
  fork: z.boolean(),
  forks: z.number(),
  forks_count: z.number(),
  forks_url: z.string(),
  full_name: z.string(),
  git_commits_url: z.string(),
  git_refs_url: z.string(),
  git_tags_url: z.string(),
  git_url: z.string(),
  has_discussions: z.boolean(),
  has_downloads: z.boolean(),
  has_issues: z.boolean(),
  has_pages: z.boolean(),
  has_projects: z.boolean(),
  has_wiki: z.boolean(),
  homepage: z.union([z.string(), z.null()]),
  hooks_url: z.string(),
  html_url: z.string(),
  id: z.number(),
  is_template: z.boolean(),
  issue_comment_url: z.string(),
  issue_events_url: z.string(),
  issues_url: z.string(),
  keys_url: z.string(),
  labels_url: z.string(),
  language: z.union([z.string(), z.null()]),
  languages_url: z.string(),
  license: z.union([GithubLicense, z.null()]),
  merges_url: z.string(),
  milestones_url: z.string(),
  mirror_url: z.union([z.string(), z.null()]),
  name: z.string(),
  node_id: z.string(),
  notifications_url: z.string(),
  open_issues: z.number(),
  open_issues_count: z.number(),

  owner: z.object({
    avatar_url: z.string(),
    events_url: z.string(),
    followers_url: z.string(),
    following_url: z.string(),
    gists_url: z.string(),
    gravatar_id: z.string(),
    html_url: z.string(),
    id: z.number(),
    login: z.string(),
    node_id: z.string(),
    organizations_url: z.string(),
    received_events_url: z.string(),
    repos_url: z.string(),
    site_admin: z.boolean(),
    starred_url: z.string(),
    subscriptions_url: z.string(),
    type: z.string(),
    url: z.string(),
    user_view_type: z.string().optional()
  }),

  permissions: z.object({
    admin: z.boolean(),
    maintain: z.boolean(),
    pull: z.boolean(),
    push: z.boolean(),
    triage: z.boolean()
  }),

  "private": z.boolean(),
  pulls_url: z.string(),
  pushed_at: z.string(),
  releases_url: z.string(),
  size: z.number(),
  ssh_url: z.string(),
  stargazers_count: z.number(),
  stargazers_url: z.string(),
  statuses_url: z.string(),
  subscribers_url: z.string(),
  subscription_url: z.string(),
  svn_url: z.string(),
  tags_url: z.string(),
  teams_url: z.string(),
  topics: z.string().array(),
  trees_url: z.string(),
  updated_at: z.string(),
  url: z.string(),
  visibility: z.string(),
  watchers: z.number(),
  watchers_count: z.number(),
  web_commit_signoff_required: z.boolean()
});

export type Repository = z.infer<typeof Repository>;

export const RepoResponse = z.object({
  repositories: Repository.array()
});

export type RepoResponse = z.infer<typeof RepoResponse>;

export const GithubMetadataInput = z.object({
  owner: z.string(),
  repo: z.string(),
  syncWindowMinutes: z.number().optional(),
  branch: z.string().optional()
});

export type GithubMetadataInput = z.infer<typeof GithubMetadataInput>;

export const GithubUser = z.object({
  id: z.string(),
  url: z.string().optional()
});

export type GithubUser = z.infer<typeof GithubUser>;

export const GithubComment = z.object({
  id: z.string(),
  body: z.string(),
  user: GithubUser,
  createdAt: z.string()
});

export type GithubComment = z.infer<typeof GithubComment>;

export const GithubCommit = z.object({
  id: z.string(),
  url: z.string(),
  branch: z.string(),
  author: GithubUser,
  message: z.string(),
  date: z.string()
});

export type GithubCommit = z.infer<typeof GithubCommit>;

export const GithubPullRequest = z.object({
  id: z.string(),
  url: z.string(),
  state: z.string(),
  title: z.string(),
  user: GithubUser,
  assignees: GithubUser.array(),
  reviewers: GithubUser.array(),
  draft: z.boolean(),
  labels: z.string().array(),

  reviewDecision: z.union([
    z.literal("APPROVED"),
    z.literal("CHANGES_REQUESTED"),
    z.literal("REVIEW_REQUIRED")
  ]),

  latestComment: GithubComment
});

export type GithubPullRequest = z.infer<typeof GithubPullRequest>;

export const models = {
  GithubLicense: GithubLicense,
  Repository: Repository,
  RepoResponse: RepoResponse,
  GithubMetadataInput: GithubMetadataInput,
  GithubUser: GithubUser,
  GithubComment: GithubComment,
  GithubCommit: GithubCommit,
  GithubPullRequest: GithubPullRequest
};