export interface SyncMetadata_linear_issues {
};

export interface LinearIssue {
  id: string;
  assigneeId: string | null;
  creatorId: string | null;
  createdAt: string;
  updatedAt: string;
  description: string | null;
  dueDate: string | null;
  projectId: string | null;
  teamId: string;
  title: string;
  status: string;
  estimate: string | null;
};

export interface SyncMetadata_linear_milestones {
};

export interface LinearMilestone {
  id: string;
  name: string;
  progress: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  status: string;
  project: {  id: string;
  name: string;};
};

export interface SyncMetadata_linear_projects {
};

export interface LinearProject {
  id: string;
  url: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  teamId: string;
};

export interface SyncMetadata_linear_roadmaps {
};

export interface LinearRoadmap {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  teamId: string;
  projectIds: string;
};

export interface SyncMetadata_linear_teams {
};

export interface LinearTeam {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export interface SyncMetadata_linear_users {
};

export interface LinearUser {
  id: string;
  admin: boolean;
  email: string;
  firstName: string;
  lastName?: string | undefined;
  avatarUrl: string | null;
};

export interface ActionInput_linear_createissue {
  teamId: string;
  title: string;
  description?: string | undefined;
  projectId?: string | undefined;
  milestoneId?: string | undefined;
  assigneeId?: string | undefined;
  priority?: number | undefined;
  parentId?: string | undefined;
  estimate?: number | undefined;
  dueDate?: string | undefined;
};

export interface ActionOutput_linear_createissue {
  id: string;
  assigneeId: string | null;
  creatorId: string | null;
  createdAt: string;
  updatedAt: string;
  description: string | null;
  dueDate: string | null;
  projectId: string | null;
  teamId: string;
  title: string;
  status: string;
  estimate: string | null;
};

export interface ActionInput_linear_fetchfields {
  name: string;
};

export interface ActionOutput_linear_fetchfields {
  fields: ({})[];
};

export type ActionInput_linear_fetchmodels = void

export interface ActionOutput_linear_fetchmodels {
  models: ({  name: string;})[];
};

export interface ActionInput_linear_fetchteams {
  after?: string | undefined;
  pageSize?: number | undefined;
};

export interface ActionOutput_linear_fetchteams {
  teams: ({  id: string;
  name: string;})[];
  pageInfo: {  hasNextPage: boolean;
  endCursor: string | null;};
};
