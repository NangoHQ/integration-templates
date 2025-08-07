import { z } from "zod";

export const EvaluAgentGroup = z.object({
  id: z.string(),
  name: z.string(),
  level: z.string(),
  active: z.boolean(),
  parent: z.string(),
  hasChildren: z.boolean(),
  isCustomReportingGroup: z.boolean()
});

export type EvaluAgentGroup = z.infer<typeof EvaluAgentGroup>;

export const EvaluAgentUser = z.object({
  id: z.string(),
  forename: z.string(),
  surname: z.string(),
  email: z.string(),
  username: z.string(),
  startDate: z.date(),
  active: z.boolean(),
  thirdPartyId: z.union([z.string(), z.number()])
});

export type EvaluAgentUser = z.infer<typeof EvaluAgentUser>;

export const EvaluAgentRole = z.object({
  id: z.string(),
  title: z.string(),
  name: z.string()
});

export type EvaluAgentRole = z.infer<typeof EvaluAgentRole>;

export const models = {
  EvaluAgentGroup: EvaluAgentGroup,
  EvaluAgentUser: EvaluAgentUser,
  EvaluAgentRole: EvaluAgentRole
};