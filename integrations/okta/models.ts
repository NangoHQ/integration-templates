import { z } from "zod";

export const ActionResponseError = z.object({
  message: z.string()
});

export type ActionResponseError = z.infer<typeof ActionResponseError>;

export const OktaAddGroup = z.object({
  description: z.string().optional(),
  name: z.string()
});

export type OktaAddGroup = z.infer<typeof OktaAddGroup>;

export const OktaUserGroupProfile = z.object({
  description: z.union([z.string(), z.null()]),
  name: z.string()
});

export type OktaUserGroupProfile = z.infer<typeof OktaUserGroupProfile>;

export const OktaActiveDirectoryGroupProfile = z.object({
  description: z.string(),
  dn: z.string(),
  externalId: z.string(),
  name: z.string(),
  samAccountName: z.string(),
  windowsDomainQualifiedName: z.string()
});

export type OktaActiveDirectoryGroupProfile = z.infer<typeof OktaActiveDirectoryGroupProfile>;

export const Group = z.object({
  id: z.string(),
  created: z.string(),
  lastMembershipUpdated: z.string(),
  lastUpdated: z.string(),
  objectClass: z.string().array(),
  type: z.union([z.literal("APP_GROUP"), z.literal("BUILT_IN"), z.literal("OKTA_GROUP")]),
  profile: z.union([OktaUserGroupProfile, OktaActiveDirectoryGroupProfile])
});

export type Group = z.infer<typeof Group>;

export const OktaAssignRemoveUserGroup = z.object({
  groupId: z.string(),
  userId: z.string()
});

export type OktaAssignRemoveUserGroup = z.infer<typeof OktaAssignRemoveUserGroup>;

export const SuccessResponse = z.object({
  success: z.boolean()
});

export type SuccessResponse = z.infer<typeof SuccessResponse>;

export const OktaCreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  login: z.string(),
  mobilePhone: z.union([z.string(), z.null()]).optional()
});

export type OktaCreateUser = z.infer<typeof OktaCreateUser>;

export const User = z.object({
  id: z.string(),
  status: z.string(),
  created: z.string(),
  activated: z.string(),
  statusChanged: z.string(),
  lastLogin: z.union([z.string(), z.null()]),
  lastUpdated: z.string(),
  passwordChanged: z.union([z.string(), z.null()]),

  type: z.object({
    id: z.string()
  }),

  profile: z.object({
    firstName: z.union([z.string(), z.null()]),
    lastName: z.union([z.string(), z.null()]),
    mobilePhone: z.union([z.string(), z.null()]),
    secondEmail: z.union([z.string(), z.null()]),
    login: z.string(),
    email: z.string()
  })
});

export type User = z.infer<typeof User>;

export const models = {
  ActionResponseError: ActionResponseError,
  OktaAddGroup: OktaAddGroup,
  OktaUserGroupProfile: OktaUserGroupProfile,
  OktaActiveDirectoryGroupProfile: OktaActiveDirectoryGroupProfile,
  Group: Group,
  OktaAssignRemoveUserGroup: OktaAssignRemoveUserGroup,
  SuccessResponse: SuccessResponse,
  OktaCreateUser: OktaCreateUser,
  User: User
};