import { z } from "zod";

export const SuccessResponse = z.object({
  success: z.boolean()
});

export type SuccessResponse = z.infer<typeof SuccessResponse>;

export const IdEntity = z.object({
  id: z.string()
});

export type IdEntity = z.infer<typeof IdEntity>;

export const User = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string()
});

export type User = z.infer<typeof User>;

export const CreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string()
});

export type CreateUser = z.infer<typeof CreateUser>;

export const TrackingCode = z.object({
  type: z.literal("tracking_code").optional(),
  name: z.string().optional(),
  value: z.string().optional()
});

export type TrackingCode = z.infer<typeof TrackingCode>;

export const BoxCreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  address: z.string().optional(),
  can_see_managed_users: z.boolean().optional(),
  external_app_user_id: z.string().optional(),
  is_exempt_from_device_limits: z.boolean().optional(),
  is_exempt_from_login_verification: z.boolean().optional(),
  is_external_collab_restricted: z.boolean().optional(),
  is_platform_access_only: z.boolean().optional(),
  is_sync_enabled: z.boolean().optional(),
  job_title: z.string().optional(),
  language: z.string().optional(),
  phone: z.string().optional(),
  role: z.union([z.literal("coadmin"), z.literal("user")]).optional(),
  space_amount: z.number().optional(),

  status: z.union([
    z.literal("active"),
    z.literal("inactive"),
    z.literal("cannot_delete_edit"),
    z.literal("cannot_delete_edit_upload")
  ]).optional(),

  timezone: z.string().optional(),
  tracking_codes: TrackingCode.array()
});

export type BoxCreateUser = z.infer<typeof BoxCreateUser>;

export const Enterprise = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string()
});

export type Enterprise = z.infer<typeof Enterprise>;

export const NotificationEmail = z.object({
  email: z.string(),
  is_confirmed: z.boolean()
});

export type NotificationEmail = z.infer<typeof NotificationEmail>;

export const CreatedUser = z.object({
  id: z.string(),
  type: z.string(),
  address: z.string().optional(),
  avatar_url: z.string().optional(),
  can_see_managed_users: z.boolean(),
  created_at: z.string(),
  enterprise: Enterprise,
  external_app_user_id: z.string().optional(),
  hostname: z.string(),
  is_exempt_from_device_limits: z.boolean(),
  is_exempt_from_login_verification: z.boolean(),
  is_external_collab_restricted: z.boolean(),
  is_platform_access_only: z.boolean(),
  is_sync_enabled: z.boolean(),
  job_title: z.string().optional(),
  language: z.string().optional(),
  login: z.string(),
  max_upload_size: z.number(),
  modified_at: z.string(),
  name: z.string(),
  notification_email: NotificationEmail,
  phone: z.string().optional(),
  role: z.string(),
  space_amount: z.number(),
  space_used: z.number(),
  status: z.string(),
  timezone: z.string().optional(),
  tracking_codes: TrackingCode.array()
});

export type CreatedUser = z.infer<typeof CreatedUser>;

export const BoxDeleteUser = z.object({
  id: z.string(),
  force: z.boolean().optional(),
  notify: z.boolean().optional()
});

export type BoxDeleteUser = z.infer<typeof BoxDeleteUser>;

export const BoxMetadata = z.object({
  files: z.string().array(),
  folders: z.string().array()
});

export type BoxMetadata = z.infer<typeof BoxMetadata>;

export const BoxDocument = z.object({
  id: z.string(),
  name: z.string(),
  download_url: z.string(),
  modified_at: z.string()
});

export type BoxDocument = z.infer<typeof BoxDocument>;

export const Folder = z.object({
  id: z.string(),
  name: z.string(),
  modified_at: z.string(),
  url: z.union([z.string(), z.null()])
});

export type Folder = z.infer<typeof Folder>;

export const FolderContentInput = z.object({
  id: z.string().optional(),
  marker: z.string().optional()
});

export type FolderContentInput = z.infer<typeof FolderContentInput>;

export const FolderContent = z.object({
  files: BoxDocument.array(),
  folders: Folder.array(),
  next_marker: z.string().optional()
});

export type FolderContent = z.infer<typeof FolderContent>;
export const Anonymous_box_action_fetchfile_output = z.string();
export type Anonymous_box_action_fetchfile_output = z.infer<typeof Anonymous_box_action_fetchfile_output>;

export const models = {
  SuccessResponse: SuccessResponse,
  IdEntity: IdEntity,
  User: User,
  CreateUser: CreateUser,
  TrackingCode: TrackingCode,
  BoxCreateUser: BoxCreateUser,
  Enterprise: Enterprise,
  NotificationEmail: NotificationEmail,
  CreatedUser: CreatedUser,
  BoxDeleteUser: BoxDeleteUser,
  BoxMetadata: BoxMetadata,
  BoxDocument: BoxDocument,
  Folder: Folder,
  FolderContentInput: FolderContentInput,
  FolderContent: FolderContent,
  Anonymous_box_action_fetchfile_output: Anonymous_box_action_fetchfile_output
};