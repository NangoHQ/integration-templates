export interface SyncMetadata_github_issues {
};

export interface GithubIssue {
  id: string;
  owner: string;
  repo: string;
  issue_number: number;
  title: string;
  author: string;
  author_id: string;
  state: string;
  date_created: Date;
  date_last_modified: Date;
  body: string;
};

export interface SyncMetadata_github_issueslite {
};

export interface Issue {
  id: string;
  createdAt: string;
  updatedAt: string;
  key: string;
  summary: string;
  issueType: string;
  status: string;
  assignee: string | null;
  url: string;
  webUrl: string;
  projectId: string;
  projectKey: string;
  projectName: string;
  comments: ({  id: string;
  createdAt: string;
  updatedAt: string;
  author: {  accountId: string | null;
  active: boolean;
  displayName: string;
  emailAddress: string | null;};
  body: {};})[];
};

export interface SyncMetadata_github_listfiles {
  owner: string;
  repo: string;
  branch: string;
};

export interface GithubRepoFile {
  id: string;
  name: string;
  url: string;
  last_modified_date: Date;
};

export type ActionInput_github_listrepos = void

export interface ActionOutput_github_listrepos {
  repos: ({  id: number;
  owner: string;
  name: string;
  full_name: string;
  description: string;
  url: string;
  date_created: Date;
  date_last_modified: Date;})[];
};

export interface ActionInput_github_writefile {
  owner: string;
  repo: string;
  path: string;
  message: string;
  content: string;
  sha: string;
};

export interface ActionOutput_github_writefile {
  url: string;
  status: string;
  sha: string;
};
