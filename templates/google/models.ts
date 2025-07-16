import { z } from "zod";

export const OrgToSync = z.object({
  id: z.string(),
  path: z.string()
});

export type OrgToSync = z.infer<typeof OrgToSync>;

export const Metadata = z.object({
  orgsToSync: OrgToSync.array()
});

export type Metadata = z.infer<typeof Metadata>;

export const OrganizationalUnit = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.union([z.string(), z.null()]),
  deletedAt: z.union([z.string(), z.null()]),
  description: z.union([z.string(), z.null()]),
  path: z.union([z.string(), z.null()]),
  parentPath: z.union([z.string(), z.null()]),
  parentId: z.union([z.string(), z.null()])
});

export type OrganizationalUnit = z.infer<typeof OrganizationalUnit>;

export const User = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.union([z.string(), z.null()]),
  givenName: z.union([z.string(), z.null()]),
  familyName: z.union([z.string(), z.null()]),
  picture: z.union([z.string(), z.null()]),
  type: z.string(),
  createdAt: z.union([z.string(), z.null()]),
  deletedAt: z.union([z.string(), z.null()]),

  phone: z.object({
    value: z.union([z.string(), z.null()]),
    type: z.union([z.string(), z.null()])
  }),

  organizationId: z.union([z.string(), z.null()]),
  organizationPath: z.union([z.string(), z.null()]),
  isAdmin: z.union([z.boolean(), z.null()]),
  department: z.union([z.string(), z.null()])
});

export type User = z.infer<typeof User>;

export const GoogleWorkspaceUserToken = z.object({
  id: z.string(),
  user_id: z.string(),
  app_name: z.string(),
  anonymous_app: z.boolean(),
  scopes: z.string()
});

export type GoogleWorkspaceUserToken = z.infer<typeof GoogleWorkspaceUserToken>;

export const models = {
  OrgToSync: OrgToSync,
  Metadata: Metadata,
  OrganizationalUnit: OrganizationalUnit,
  User: User,
  GoogleWorkspaceUserToken: GoogleWorkspaceUserToken
};