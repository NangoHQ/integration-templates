import { z } from "zod";

export const IdEntity = z.object({
  id: z.string()
});

export type IdEntity = z.infer<typeof IdEntity>;

export const SuccessResponse = z.object({
  success: z.boolean()
});

export type SuccessResponse = z.infer<typeof SuccessResponse>;

export const CreateUser = z.object({
  first_name: z.string(),
  last_name: z.string(),
  email: z.string()
});

export type CreateUser = z.infer<typeof CreateUser>;

export const HarvestCreateUser = z.object({
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  timezone: z.string().optional(),
  has_access_to_all_future_projects: z.boolean().optional(),
  is_contractor: z.boolean().optional(),
  is_active: z.boolean().optional(),
  weekly_capacity: z.number().optional(),
  default_hourly_rate: z.literal("decimal").optional(),
  cost_rate: z.literal("decimal").optional(),
  roles: z.string().optional().array(),

  access_roles: z.union([
    z.literal("administrator"),
    z.literal("manager"),
    z.literal("member"),
    z.literal("project_creator"),
    z.literal("billable_rates_manager"),
    z.literal("managed_projects_invoice_drafter"),
    z.literal("managed_projects_invoice_manager"),
    z.literal("client_and_task_manager"),
    z.literal("time_and_expenses_manager"),
    z.literal("estimates_manager")
  ]).optional()
});

export type HarvestCreateUser = z.infer<typeof HarvestCreateUser>;

export const User = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string()
});

export type User = z.infer<typeof User>;

export const models = {
  IdEntity: IdEntity,
  SuccessResponse: SuccessResponse,
  CreateUser: CreateUser,
  HarvestCreateUser: HarvestCreateUser,
  User: User
};