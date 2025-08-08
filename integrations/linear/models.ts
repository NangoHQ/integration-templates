import { z } from "zod";

export const LinearIssue = z.object({
  id: z.string(),
  assigneeId: z.union([z.string(), z.null()]),
  creatorId: z.union([z.string(), z.null()]),
  createdAt: z.string(),
  updatedAt: z.string(),
  description: z.union([z.string(), z.null()]),
  dueDate: z.union([z.string(), z.null()]),
  projectId: z.union([z.string(), z.null()]),
  teamId: z.string(),
  title: z.string(),
  status: z.string(),
  estimate: z.union([z.string(), z.null()])
});

export type LinearIssue = z.infer<typeof LinearIssue>;

export const CreateIssue = z.object({
  teamId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  projectId: z.string().optional(),
  milestoneId: z.string().optional(),
  assigneeId: z.string().optional(),
  priority: z.number().optional(),
  parentId: z.string().optional(),
  estimate: z.number().optional(),
  dueDate: z.string().optional()
});

export type CreateIssue = z.infer<typeof CreateIssue>;

export const LinearTeamBase = z.object({
  id: z.string(),
  name: z.string()
});

export type LinearTeamBase = z.infer<typeof LinearTeamBase>;

export const LinearTeam = z.object({
  id: z.string(),
  name: z.string(),
  description: z.union([z.string(), z.null()]),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type LinearTeam = z.infer<typeof LinearTeam>;

export const LinearUser = z.object({
  id: z.string(),
  admin: z.boolean(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string().optional(),
  avatarUrl: z.union([z.string(), z.null()])
});

export type LinearUser = z.infer<typeof LinearUser>;

export const LinearProject = z.object({
  id: z.string(),
  url: z.string(),
  name: z.string(),
  description: z.union([z.string(), z.null()]),
  createdAt: z.string(),
  updatedAt: z.string(),
  teamId: z.string()
});

export type LinearProject = z.infer<typeof LinearProject>;

export const LinearRoadmap = z.object({
  id: z.string(),
  name: z.string(),
  description: z.union([z.string(), z.null()]),
  createdAt: z.string(),
  updatedAt: z.string(),
  teamId: z.string(),
  projectIds: z.string()
});

export type LinearRoadmap = z.infer<typeof LinearRoadmap>;

export const LinearMilestone = z.object({
  id: z.string(),
  name: z.string(),
  progress: z.number(),
  description: z.union([z.string(), z.null()]),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: z.string(),

  project: z.object({
    id: z.string(),
    name: z.string()
  })
});

export type LinearMilestone = z.infer<typeof LinearMilestone>;

export const TeamsPaginatedResponse = z.object({
  teams: LinearTeamBase.array(),

  pageInfo: z.object({
    hasNextPage: z.boolean(),
    endCursor: z.union([z.string(), z.null()])
  })
});

export type TeamsPaginatedResponse = z.infer<typeof TeamsPaginatedResponse>;

export const FetchTeamsInput = z.object({
  after: z.string().optional(),
  pageSize: z.number().optional()
});

export type FetchTeamsInput = z.infer<typeof FetchTeamsInput>;

export const Entity = z.object({
  name: z.string()
});

export type Entity = z.infer<typeof Entity>;

export const Field = z.object({}).catchall(
  z.union([
    z.string(),
    z.record(z.string(), z.string())
  ])
);
export type Field = z.infer<typeof Field>;

export const FieldResponse = z.object({
  fields: Field.array()
});

export type FieldResponse = z.infer<typeof FieldResponse>;

export const Model = z.object({
  name: z.string()
});

export type Model = z.infer<typeof Model>;

export const ModelResponse = z.object({
  models: Model.array()
});

export type ModelResponse = z.infer<typeof ModelResponse>;

export const models = {
  LinearIssue: LinearIssue,
  CreateIssue: CreateIssue,
  LinearTeamBase: LinearTeamBase,
  LinearTeam: LinearTeam,
  LinearUser: LinearUser,
  LinearProject: LinearProject,
  LinearRoadmap: LinearRoadmap,
  LinearMilestone: LinearMilestone,
  TeamsPaginatedResponse: TeamsPaginatedResponse,
  FetchTeamsInput: FetchTeamsInput,
  Entity: Entity,
  Field: Field,
  FieldResponse: FieldResponse,
  Model: Model,
  ModelResponse: ModelResponse
};
