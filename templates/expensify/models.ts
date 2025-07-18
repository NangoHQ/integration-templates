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

export const ExpensifyDisableUser = z.object({
  id: z.string(),
  email: z.string()
});

export type ExpensifyDisableUser = z.infer<typeof ExpensifyDisableUser>;

export const ExpsensifyNullableUser = z.object({
  id: z.string(),
  firstName: z.union([z.string(), z.null()]),
  lastName: z.union([z.string(), z.null()]),
  email: z.string()
});

export type ExpsensifyNullableUser = z.infer<typeof ExpsensifyNullableUser>;

export const Policy = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  shouldShowAutoApprovalOptions: z.boolean(),
  role: z.string(),
  areCompanyCardsEnabled: z.boolean(),
  shouldShowCustomReportTitleOption: z.boolean(),
  areExpensifyCardsEnabled: z.boolean(),
  areRulesEnabled: z.boolean(),
  areConnectionsEnabled: z.boolean(),
  approvalMode: z.string(),
  areCategoriesEnabled: z.boolean(),
  areReportFieldsEnabled: z.boolean(),
  areWorkflowsEnabled: z.boolean(),
  outputCurrency: z.string(),
  owner: z.string(),
  areInvoicesEnabled: z.boolean(),
  createdAt: z.string(),
  eReceipts: z.boolean(),
  shouldShowAutoReimbursementLimitOption: z.boolean(),
  areDistanceRatesEnabled: z.boolean(),
  isPolicyExpenseChatEnabled: z.string(),
  ownerAccountID: z.number(),
  areTagsEnabled: z.boolean()
});

export type Policy = z.infer<typeof Policy>;

export const ExpensifyListPolicyOutput = z.object({
  policies: Policy.array()
});

export type ExpensifyListPolicyOutput = z.infer<typeof ExpensifyListPolicyOutput>;

export const models = {
  IdEntity: IdEntity,
  SuccessResponse: SuccessResponse,
  ActionResponseError: ActionResponseError,
  CreateUser: CreateUser,
  User: User,
  ExpensifyDisableUser: ExpensifyDisableUser,
  ExpsensifyNullableUser: ExpsensifyNullableUser,
  Policy: Policy,
  ExpensifyListPolicyOutput: ExpensifyListPolicyOutput
};
