import { z } from "zod";

export const IdEntity = z.object({
  id: z.string()
});

export type IdEntity = z.infer<typeof IdEntity>;

export const SuccessResponse = z.object({
  success: z.boolean()
});

export type SuccessResponse = z.infer<typeof SuccessResponse>;

export const ActionResponseError = z.object({
  message: z.string()
});

export type ActionResponseError = z.infer<typeof ActionResponseError>;

export const CreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string()
});

export type CreateUser = z.infer<typeof CreateUser>;

export const User = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string()
});

export type User = z.infer<typeof User>;

export const JiraCreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  products: z.string().optional().array()
});

export type JiraCreateUser = z.infer<typeof JiraCreateUser>;

export const Team = z.object({
  id: z.string(),
  name: z.string()
});

export type Team = z.infer<typeof Team>;

export const Teams = z.object({
  teams: Team.array()
});

export type Teams = z.infer<typeof Teams>;

export const models = {
  IdEntity: IdEntity,
  SuccessResponse: SuccessResponse,
  ActionResponseError: ActionResponseError,
  CreateUser: CreateUser,
  User: User,
  JiraCreateUser: JiraCreateUser,
  Team: Team,
  Teams: Teams
};