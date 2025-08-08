import { z } from "zod";

export const Account = z.object({
  id: z.number(),
  name: z.string(),
  product: z.string(),
  href: z.string(),
  app_href: z.string(),
  hidden: z.boolean().optional()
});

export type Account = z.infer<typeof Account>;

export const UserInformation = z.object({
  identity: z.object({
    id: z.number(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string()
  }),

  accounts: Account.array()
});

export type UserInformation = z.infer<typeof UserInformation>;

export const DockItem = z.object({
  id: z.number(),
  title: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  position: z.union([z.number(), z.null()]),
  url: z.string(),
  app_url: z.string()
});

export type DockItem = z.infer<typeof DockItem>;

export const BasecampProject = z.object({
  id: z.number(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  name: z.string(),
  description: z.union([z.string(), z.null()]),
  purpose: z.string(),
  clients_enabled: z.boolean(),
  timesheet_enabled: z.boolean().optional(),
  color: z.union([z.string(), z.null()]).optional(),
  last_needle_color: z.union([z.string(), z.null()]).optional(),
  last_needle_position: z.union([z.string(), z.null()]).optional(),
  previous_needle_position: z.union([z.string(), z.null()]).optional(),
  bookmark_url: z.string(),
  url: z.string(),
  app_url: z.string(),
  dock: DockItem.array(),
  bookmarked: z.boolean()
});

export type BasecampProject = z.infer<typeof BasecampProject>;

export const BasecampProjectsResponse = z.object({
  projects: BasecampProject.array()
});

export type BasecampProjectsResponse = z.infer<typeof BasecampProjectsResponse>;

export const BasecampTodolist = z.object({
  id: z.number(),
  status: z.string().optional(),
  visible_to_clients: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  title: z.string().optional(),
  inherits_status: z.boolean().optional(),
  type: z.string().optional(),
  url: z.string().optional(),
  app_url: z.string().optional(),
  bookmark_url: z.string().optional(),
  subscription_url: z.string().optional(),
  comments_count: z.number().optional(),
  comments_url: z.string().optional(),
  position: z.number().optional(),
  parent: z.any().optional(),
  bucket: z.any().optional(),
  creator: z.any().optional(),
  description: z.string().optional(),
  completed: z.boolean().optional(),
  completed_ratio: z.string().optional(),
  name: z.string().optional(),
  todos_url: z.string().optional(),
  groups_url: z.string().optional(),
  app_todos_url: z.string().optional()
});

export type BasecampTodolist = z.infer<typeof BasecampTodolist>;

export const BasecampTodolistsResponse = z.object({
  todolists: BasecampTodolist.array()
});

export type BasecampTodolistsResponse = z.infer<typeof BasecampTodolistsResponse>;

export const BasecampCreateTodoInput = z.object({
  projectId: z.number(),
  todoListId: z.number(),
  content: z.string(),
  description: z.string().optional(),
  due_on: z.string().optional(),
  starts_on: z.string().optional(),
  notify: z.boolean().optional(),
  assigneeEmails: z.string().optional().array(),
  completionSubscriberEmails: z.string().optional().array()
});

export type BasecampCreateTodoInput = z.infer<typeof BasecampCreateTodoInput>;

export const BasecampFetchTodolistsInput = z.object({
  projectId: z.number(),
  todoSetId: z.number()
});

export type BasecampFetchTodolistsInput = z.infer<typeof BasecampFetchTodolistsInput>;

export const BasecampTodoParent = z.object({
  id: z.number(),
  title: z.string(),
  type: z.string(),
  url: z.string(),
  app_url: z.string()
});

export type BasecampTodoParent = z.infer<typeof BasecampTodoParent>;

export const BasecampTodoBucket = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string()
});

export type BasecampTodoBucket = z.infer<typeof BasecampTodoBucket>;

export const BasecampTodoResponse = z.object({
  id: z.number(),
  status: z.string(),
  visible_to_clients: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  title: z.string(),
  inherits_status: z.boolean(),
  type: z.string(),
  url: z.string(),
  app_url: z.string(),
  bookmark_url: z.string(),
  subscription_url: z.string(),
  comments_count: z.number(),
  comments_url: z.string(),
  position: z.number(),
  parent: BasecampTodoParent,
  bucket: BasecampTodoBucket,
  creator: z.any(),
  description: z.string(),
  completed: z.boolean(),
  content: z.string(),
  starts_on: z.string(),
  due_on: z.string(),
  assignees: z.any().array(),
  completion_subscribers: z.any().array(),
  completion_url: z.string()
});

export type BasecampTodoResponse = z.infer<typeof BasecampTodoResponse>;

export const BasecampPerson = z.object({
  id: z.number(),
  name: z.string(),
  email_address: z.string(),
  avatar_url: z.string().optional(),
  admin: z.boolean().optional(),
  owner: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  attachable_sgid: z.string().optional(),
  personable_type: z.string().optional(),
  title: z.union([z.string(), z.null()]).optional(),
  bio: z.union([z.string(), z.null()]).optional(),
  location: z.union([z.string(), z.null()]).optional()
});

export type BasecampPerson = z.infer<typeof BasecampPerson>;

export const BasecampTodo = z.object({
  id: z.string(),
  content: z.string(),
  description: z.string().optional(),
  due_on: z.union([z.string(), z.null()]).optional(),
  completed: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  bucket_id: z.number(),
  assignees: BasecampPerson.array().optional()
});

export type BasecampTodo = z.infer<typeof BasecampTodo>;

export const BasecampCompany = z.object({
  id: z.number(),
  name: z.string()
});

export type BasecampCompany = z.infer<typeof BasecampCompany>;

export const ClientSide = z.object({
  url: z.string(),
  app_url: z.string()
});

export type ClientSide = z.infer<typeof ClientSide>;

export const Project = z.object({
  projectId: z.number(),
  todoSetId: z.number()
});

export type Project = z.infer<typeof Project>;

export const TodosMetadata = z.object({
  projects: Project.array()
});

export type TodosMetadata = z.infer<typeof TodosMetadata>;

export const models = {
  Account: Account,
  UserInformation: UserInformation,
  DockItem: DockItem,
  BasecampProject: BasecampProject,
  BasecampProjectsResponse: BasecampProjectsResponse,
  BasecampTodolist: BasecampTodolist,
  BasecampTodolistsResponse: BasecampTodolistsResponse,
  BasecampCreateTodoInput: BasecampCreateTodoInput,
  BasecampFetchTodolistsInput: BasecampFetchTodolistsInput,
  BasecampTodoParent: BasecampTodoParent,
  BasecampTodoBucket: BasecampTodoBucket,
  BasecampTodoResponse: BasecampTodoResponse,
  BasecampPerson: BasecampPerson,
  BasecampTodo: BasecampTodo,
  BasecampCompany: BasecampCompany,
  ClientSide: ClientSide,
  Project: Project,
  TodosMetadata: TodosMetadata
};