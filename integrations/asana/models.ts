import { z } from "zod";

export const Id = z.object({
  id: z.string()
});

export type Id = z.infer<typeof Id>;

export const Timestamps = z.object({
  created_at: z.union([z.string(), z.null()]),
  modified_at: z.union([z.string(), z.null()])
});

export type Timestamps = z.infer<typeof Timestamps>;

export const NangoActionError = z.object({
  type: z.union([z.literal("validation_error"), z.literal("generic_error")]),
  message: z.string()
});

export type NangoActionError = z.infer<typeof NangoActionError>;

export const BaseAsanaModel = z.object({
  gid: z.string(),
  resource_type: z.string(),
  name: z.string()
});

export type BaseAsanaModel = z.infer<typeof BaseAsanaModel>;

export const Limit = z.object({
  limit: z.number()
});

export type Limit = z.infer<typeof Limit>;

export const User = z.object({
  created_at: z.union([z.string(), z.null()]),
  modified_at: z.union([z.string(), z.null()]),
  id: z.string(),
  name: z.string(),
  email: z.union([z.string(), z.null()]),
  avatar_url: z.union([z.string(), z.null()])
});

export type User = z.infer<typeof User>;

export const Task = z.object({
  created_at: z.union([z.string(), z.null()]),
  modified_at: z.union([z.string(), z.null()]),
  id: z.string(),
  title: z.string(),
  url: z.string(),
  status: z.string(),
  description: z.union([z.string(), z.null()]),
  assignee: z.union([User, z.null()]),
  due_date: z.union([z.string(), z.null()])
});

export type Task = z.infer<typeof Task>;

export const AsanaProjectInput = z.object({
  limit: z.number(),
  workspace: z.string()
});

export type AsanaProjectInput = z.infer<typeof AsanaProjectInput>;

export const CreateAsanaTask = z.object({
  name: z.string(),
  workspace: z.string(),
  parent: z.string(),
  projects: z.string().array()
});

export type CreateAsanaTask = z.infer<typeof CreateAsanaTask>;

export const AsanaPhoto = z.object({
  image_1024x1024: z.string(),
  image_128x128: z.string(),
  image_21x21: z.string(),
  image_27x27: z.string(),
  image_36x36: z.string(),
  image_60x60: z.string()
});

export type AsanaPhoto = z.infer<typeof AsanaPhoto>;

export const AsanaUser = z.object({
  gid: z.string(),
  resource_type: z.string(),
  name: z.string(),
  id: z.string(),
  email: z.string(),
  photo: z.union([AsanaPhoto, z.null()]),
  workspace: z.string()
});

export type AsanaUser = z.infer<typeof AsanaUser>;

export const AsanaTask = z.object({
  gid: z.string(),
  resource_type: z.string(),
  name: z.string(),
  created_at: z.union([z.string(), z.null()]),
  modified_at: z.union([z.string(), z.null()]),
  completed: z.boolean(),
  due_date: z.union([z.string(), z.null()]),
  tags: z.string().array(),
  start_on: z.union([z.string(), z.null()]),
  due_at: z.union([z.string(), z.null()]),
  due_on: z.union([z.string(), z.null()]),
  completed_at: z.union([z.string(), z.null()]),
  actual_time_minutes: z.number(),
  assignee: z.union([AsanaUser, z.null()]),
  start_at: z.union([z.string(), z.null()]),
  num_hearts: z.number(),
  num_likes: z.number(),
  workspace: BaseAsanaModel,
  hearted: z.boolean(),
  hearts: z.string().array(),
  liked: z.boolean(),
  likes: z.string().array(),
  notes: z.string(),
  assignee_status: z.string(),
  followers: BaseAsanaModel.array(),

  parent: z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string(),
    resource_subtype: z.string()
  }),

  permalink_url: z.string()
});

export type AsanaTask = z.infer<typeof AsanaTask>;

export const AsanaUpdateTask = z.object({
  id: z.string(),
  due_at: z.string().optional(),
  due_on: z.string().optional(),
  completed: z.boolean(),
  notes: z.string(),
  projects: z.string().array(),
  assignee: z.string(),
  parent: z.string(),
  tags: z.string().array(),
  workspace: z.string(),
  name: z.string()
});

export type AsanaUpdateTask = z.infer<typeof AsanaUpdateTask>;

export const AsanaWorkspace = z.object({
  gid: z.string(),
  resource_type: z.string(),
  name: z.string(),
  id: z.string(),
  is_organization: z.boolean()
});

export type AsanaWorkspace = z.infer<typeof AsanaWorkspace>;

export const AsanaProject = z.object({
  gid: z.string(),
  resource_type: z.string(),
  name: z.string(),
  id: z.string()
});

export type AsanaProject = z.infer<typeof AsanaProject>;
export const Anonymous_asana_action_fetchworkspaces_output = BaseAsanaModel.array();
export type Anonymous_asana_action_fetchworkspaces_output = z.infer<typeof Anonymous_asana_action_fetchworkspaces_output>;
export const Anonymous_asana_action_fetchprojects_output = BaseAsanaModel.array();
export type Anonymous_asana_action_fetchprojects_output = z.infer<typeof Anonymous_asana_action_fetchprojects_output>;
export const Anonymous_asana_action_deletetask_output = z.boolean();
export type Anonymous_asana_action_deletetask_output = z.infer<typeof Anonymous_asana_action_deletetask_output>;

export const models = {
  Id: Id,
  Timestamps: Timestamps,
  NangoActionError: NangoActionError,
  BaseAsanaModel: BaseAsanaModel,
  Limit: Limit,
  User: User,
  Task: Task,
  AsanaProjectInput: AsanaProjectInput,
  CreateAsanaTask: CreateAsanaTask,
  AsanaPhoto: AsanaPhoto,
  AsanaUser: AsanaUser,
  AsanaTask: AsanaTask,
  AsanaUpdateTask: AsanaUpdateTask,
  AsanaWorkspace: AsanaWorkspace,
  AsanaProject: AsanaProject,
  Anonymous_asana_action_fetchworkspaces_output: Anonymous_asana_action_fetchworkspaces_output,
  Anonymous_asana_action_fetchprojects_output: Anonymous_asana_action_fetchprojects_output,
  Anonymous_asana_action_deletetask_output: Anonymous_asana_action_deletetask_output
};
