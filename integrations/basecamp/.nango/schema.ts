export interface SyncMetadata_basecamp_todos {
  projects: ({  projectId: number;
  todoSetId: number;})[];
};

export interface BasecampTodo {
  id: string;
  content: string;
  description?: string | undefined;
  due_on?: string | null | undefined;
  completed: boolean;
  created_at: string;
  updated_at: string;
  bucket_id: number;
  assignees?: ({  id: number;
  name: string;
  email_address: string;
  avatar_url?: string | undefined;
  admin?: boolean | undefined;
  owner?: boolean | undefined;
  created_at?: string | undefined;
  updated_at?: string | undefined;
  attachable_sgid?: string | undefined;
  personable_type?: string | undefined;
  title?: string | null | undefined;
  bio?: string | null | undefined;
  location?: string | null | undefined;})[];
};

export interface ActionInput_basecamp_createtodo {
  projectId: number;
  todoListId: number;
  content: string;
  description?: string | undefined;
  due_on?: string | undefined;
  starts_on?: string | undefined;
  notify?: boolean | undefined;
  assigneeEmails: string[];
  completionSubscriberEmails: string[];
};

export interface ActionOutput_basecamp_createtodo {
  id: number;
  status: string;
  visible_to_clients: boolean;
  created_at: string;
  updated_at: string;
  title: string;
  inherits_status: boolean;
  type: string;
  url: string;
  app_url: string;
  bookmark_url: string;
  subscription_url: string;
  comments_count: number;
  comments_url: string;
  position: number;
  parent: {  id: number;
  title: string;
  type: string;
  url: string;
  app_url: string;};
  bucket: {  id: number;
  name: string;
  type: string;};
  creator?: any | undefined;
  description: string;
  completed: boolean;
  content: string;
  starts_on: string;
  due_on: string;
  assignees: any[];
  completion_subscribers: any[];
  completion_url: string;
};

export type ActionInput_basecamp_fetchaccounts = void

export interface ActionOutput_basecamp_fetchaccounts {
  identity: {  id: number;
  firstName: string;
  lastName: string;
  email: string;};
  accounts: ({  id: number;
  name: string;
  product: string;
  href: string;
  app_href: string;
  hidden?: boolean | undefined;})[];
};

export type ActionInput_basecamp_fetchprojects = void

export interface ActionOutput_basecamp_fetchprojects {
  projects: ({  id: number;
  status: string;
  created_at: string;
  updated_at: string;
  name: string;
  description: string | null;
  purpose: string;
  clients_enabled: boolean;
  timesheet_enabled?: boolean | undefined;
  color?: string | null | undefined;
  last_needle_color?: string | null | undefined;
  last_needle_position?: string | null | undefined;
  previous_needle_position?: string | null | undefined;
  bookmark_url: string;
  url: string;
  app_url: string;
  dock: ({  id: number;
  title: string;
  name: string;
  enabled: boolean;
  position: number | null;
  url: string;
  app_url: string;})[];
  bookmarked: boolean;})[];
};

export interface ActionInput_basecamp_fetchtodolists {
  projectId: number;
  todoSetId: number;
};

export interface ActionOutput_basecamp_fetchtodolists {
  todolists: ({  id: number;
  status?: string | undefined;
  visible_to_clients?: boolean | undefined;
  created_at?: string | undefined;
  updated_at?: string | undefined;
  title?: string | undefined;
  inherits_status?: boolean | undefined;
  type?: string | undefined;
  url?: string | undefined;
  app_url?: string | undefined;
  bookmark_url?: string | undefined;
  subscription_url?: string | undefined;
  comments_count?: number | undefined;
  comments_url?: string | undefined;
  position?: number | undefined;
  parent?: any | undefined;
  bucket?: any | undefined;
  creator?: any | undefined;
  description?: string | undefined;
  completed?: boolean | undefined;
  completed_ratio?: string | undefined;
  name?: string | undefined;
  todos_url?: string | undefined;
  groups_url?: string | undefined;
  app_todos_url?: string | undefined;})[];
};
