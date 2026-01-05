export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface SyncMetadata_asana_projects {
};

export interface AsanaProject {
  gid: string;
  resource_type: string;
  name: string;
  id: string;
};

export interface SyncMetadata_asana_tasks {
};

export interface Task {
  id: string;
  task_type: string | null;
  title: string | null;
  priority: string | null;
  assigned_to: string | null;
  due_date: string | null;
  notes: string | null;
  returned_associations?: {  companies?: ({  id: string;
  name: string | null;})[] | undefined;
  contacts?: ({  id: string;
  first_name: string | null;
  last_name: string | null;})[] | undefined;
  deals?: ({  id: string;
  name: string | null;})[] | undefined;};
};

export interface SyncMetadata_asana_users {
};

export interface SyncMetadata_asana_workspaces {
};

export interface AsanaWorkspace {
  gid: string;
  resource_type: string;
  name: string;
  id: string;
  is_organization: boolean;
};

export interface ActionInput_asana_createtask {
  name: string;
  workspace: string;
  parent: string;
  projects: string[];
};

export interface ActionOutput_asana_createtask {
  created_at: string | null;
  modified_at: string | null;
  id: string;
  title: string;
  url: string;
  status: string;
  description: string | null;
  assignee: {  created_at: string | null;
  modified_at: string | null;
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;} | null;
  due_date: string | null;
};

export interface ActionInput_asana_deletetask {
  id: string;
};

export type ActionOutput_asana_deletetask = boolean

export interface ActionInput_asana_fetchprojects {
  limit: number;
  workspace: string;
};

export interface ActionOutput_asana_fetchprojects {
  0: {  gid: string;
  resource_type: string;
  name: string;};
};

export interface ActionInput_asana_fetchworkspaces {
  limit: number;
};

export interface ActionOutput_asana_fetchworkspaces {
  0: {  gid: string;
  resource_type: string;
  name: string;};
};

export interface ActionInput_asana_updatetask {
  id: string;
  due_at?: string | undefined;
  due_on?: string | undefined;
  completed: boolean;
  notes: string;
  projects: string[];
  assignee: string;
  parent: string;
  tags: string[];
  workspace: string;
  name: string;
};

export interface ActionOutput_asana_updatetask {
  created_at: string | null;
  modified_at: string | null;
  id: string;
  title: string;
  url: string;
  status: string;
  description: string | null;
  assignee: {  created_at: string | null;
  modified_at: string | null;
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;} | null;
  due_date: string | null;
};
