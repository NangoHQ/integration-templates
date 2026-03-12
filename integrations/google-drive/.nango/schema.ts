export interface Folder {
  id: string;
  name: string | null;
  created_at: string | null;
  modified_at: string | null;
};

export interface SyncMetadata_google_drive_syncfiles {
  /**
   * Array of file IDs to sync directly
   */
  files?: string[] | undefined;
  /**
   * Array of folder IDs to sync recursively
   */
  folders?: string[] | undefined;
};

export interface File {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[] | undefined;
  driveId?: string | undefined;
  createdTime: string;
  modifiedTime: string;
  size?: string | undefined;
  webViewLink?: string | undefined;
  trashed?: boolean | undefined;
};

export interface Permission {
  id: string;
  file_id: string;
  permission_id: string;
  type: string;
  role: string;
  display_name: string | null;
  email_address: string | null;
  domain: string | null;
  allow_file_discovery: boolean | null;
  deleted: boolean | null;
};

export interface SharedDrive {
  id: string;
  name: string;
  colorRgb?: string | undefined;
  kind?: string | undefined;
  backgroundImageLink?: string | undefined;
  themeId?: string | undefined;
  createdTime?: string | undefined;
  hidden?: boolean | undefined;
};

export interface ActionInput_google_drive_copyfile {
  /**
   * The ID of the file to copy. Example: "123abc"
   */
  file_id: string;
  /**
   * The new name for the copied file. If not provided, the original name is used.
   */
  name?: string | undefined;
  /**
   * The ID of the folder where the copy should be placed. If not provided, the copy is placed in the same folder as the original.
   */
  destination_folder_id?: string | undefined;
};

export interface ActionOutput_google_drive_copyfile {
  /**
   * The ID of the copied file
   */
  id: string;
  /**
   * The name of the copied file
   */
  name: string;
  /**
   * The MIME type of the copied file
   */
  mime_type: string;
  /**
   * The creation time of the copied file (RFC 3339)
   */
  created_at: string | null;
};

export interface ActionInput_google_drive_createcomment {
  /**
   * The ID of the file to comment on. Example: "1zpWYuzY5S65OUGNBZQXmJf4FZnIWLJHBkC2xBamBzvw"
   */
  file_id: string;
  /**
   * The plain text content of the comment. Example: "This is a test comment."
   */
  content: string;
  /**
   * A region of the document represented as a JSON string for anchored comments. Example: "{\"r\":\"revision_id\",\"a\":[{\"line\":{\"end\":\"1\"}}]}"
   */
  anchor?: string | undefined;
};

export interface ActionOutput_google_drive_createcomment {
  /**
   * The ID of the comment.
   */
  id: string;
  /**
   * The plain text content of the comment.
   */
  content: string;
  /**
   * The time when the comment was created (RFC 3339 date-time).
   */
  created_time: string;
  /**
   * The time when the comment was last modified (RFC 3339 date-time).
   */
  modified_time: string;
  /**
   * The author of the comment.
   */
  author?: {  /**
   * The display name of the author.
   */
  display_name?: string | undefined;
  /**
   * The email address of the author.
   */
  email_address?: string | undefined;};
  /**
   * Whether the comment has been resolved.
   */
  resolved: boolean;
  /**
   * Whether the comment has been deleted.
   */
  deleted: boolean;
};

export interface ActionInput_google_drive_createfolder {
  /**
   * The name of the new folder. Example: "My New Folder"
   */
  name: string;
  /**
   * The ID of the parent folder where the new folder will be created. If omitted, the folder is created in the root of the drive. Example: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
   */
  parent_id?: string | undefined;
};

export interface ActionOutput_google_drive_createfolder {
  /**
   * The unique identifier of the created folder.
   */
  id: string;
  /**
   * The name of the created folder.
   */
  name: string;
  /**
   * The MIME type of the folder (always application/vnd.google-apps.folder).
   */
  mime_type: string;
  /**
   * The timestamp when the folder was created.
   */
  created_at: string;
  /**
   * Array of parent folder IDs.
   */
  parent_ids: string[];
};

export interface ActionInput_google_drive_createshareddrive {
  /**
   * The name of the shared drive. Example: "Project Resources"
   */
  name: string;
  request_id?: string | undefined;
};

export interface ActionOutput_google_drive_createshareddrive {
  id: string;
  name: string;
  kind?: string | undefined;
  colorRgb?: string | undefined;
  backgroundImageLink?: string | undefined;
  capabilities?: any | undefined;
  themeId?: string | undefined;
  createdTime?: string | undefined;
  hidden?: boolean | undefined;
  restrictions?: any | undefined;
  orgUnitId?: string | undefined;
};

export interface ActionInput_google_drive_deletecomment {
  /**
   * The ID of the file containing the comment. Example: "1oD5i7NbLYQ6_mzEjNIXSqFvKXvvRNETwkfLrlDooFV0"
   */
  file_id: string;
  /**
   * The ID of the comment to delete. Example: "AAAB1rDkxSA"
   */
  comment_id: string;
};

export interface ActionOutput_google_drive_deletecomment {
  /**
   * Whether the deletion was successful
   */
  success: boolean;
  /**
   * The ID of the file from which the comment was deleted
   */
  file_id: string;
  /**
   * The ID of the deleted comment
   */
  comment_id: string;
};

export interface ActionInput_google_drive_deletefile {
  /**
   * The ID of the file or folder to delete. Example: "1aBcDeFgHiJkLmNoPqRsTuVwXyZ123456"
   */
  file_id: string;
};

export interface ActionOutput_google_drive_deletefile {
  /**
   * Whether the file was successfully deleted
   */
  success: boolean;
  /**
   * The ID of the deleted file
   */
  file_id: string;
};

export interface ActionInput_google_drive_deletepermission {
  /**
   * The ID of the file to delete the permission from. Example: "1xJTXyJ1Pm1rK3Y9J1Y9J1Y9J1Y9J1Y9J"
   */
  file_id: string;
  /**
   * The ID of the permission to delete. Example: "12345678901234567890"
   */
  permission_id: string;
};

export interface ActionOutput_google_drive_deletepermission {
  success: boolean;
  file_id: string;
  permission_id: string;
};

export interface ActionInput_google_drive_deleteshareddrive {
  /**
   * The ID of the shared drive to delete. Example: "0AP4r1ZoX57FvUk9PVA"
   */
  drive_id: string;
};

export interface ActionOutput_google_drive_deleteshareddrive {
  success: boolean;
  drive_id: string;
};

export interface ActionInput_google_drive_emptytrash {
};

export interface ActionOutput_google_drive_emptytrash {
  success: boolean;
};

export interface ActionInput_google_drive_findfile {
  /**
   * Search query string. Uses Google Drive search query syntax. Example: "name contains 'report'" or "mimeType = 'application/pdf'". If not provided, returns all files.
   */
  query?: string | undefined;
  /**
   * Pagination cursor (nextPageToken) from previous response. Omit for first page.
   */
  cursor?: string | undefined;
  /**
   * Maximum number of files to return per page. Default is 100.
   */
  page_size?: number | undefined;
};

export interface ActionOutput_google_drive_findfile {
  files: ({  id: string;
  name: string;
  mime_type: string;
  modified_time?: string | undefined;
  size?: string | undefined;
  web_view_link?: string | undefined;})[];
  /**
   * Pagination cursor for the next page. Null if no more results.
   */
  next_cursor: string | null;
  /**
   * Total number of files returned in this page
   */
  total_results?: number | undefined;
};

export interface ActionInput_google_drive_findfolder {
  /**
   * Folder name or search query to find folders by name. Example: "Test Folder Alpha"
   */
  name: string;
};

export interface ActionOutput_google_drive_findfolder {
  folders: ({  id: string;
  name: string;
  created_at?: string | undefined;})[];
  total_count: number;
};

export interface ActionInput_google_drive_getabout {
};

export interface ActionOutput_google_drive_getabout {
  kind: string;
  user: {  kind: string;
  displayName: string | null;
  photoLink: string | null;
  me?: boolean | undefined;
  permissionId: string | null;
  emailAddress: string | null;};
  storageQuota?: {  limit: string | null;
  usage: string | null;
  usageInDrive: string | null;
  usageInDriveTrash: string | null;} | undefined;
  importFormats?: {  [key: string]: string[];} | undefined;
  exportFormats?: {  [key: string]: string[];} | undefined;
  maxImportSizes?: {  [key: string]: string;} | undefined;
  maxUploadSize?: string | null | undefined;
  appInstalled?: boolean | undefined;
  folderColorPalette?: string[] | undefined;
  teamDriveThemes?: ({  id: string;
  backgroundImageLink: string;
  colorRgb: string;})[] | undefined;
  driveThemes?: ({  id: string;
  backgroundImageLink: string;
  colorRgb: string;})[] | undefined;
  canCreateTeamDrives?: boolean | undefined;
  canCreateDrives?: boolean | undefined;
};

export interface ActionInput_google_drive_getchangesstartpagetoken {
};

export interface ActionOutput_google_drive_getchangesstartpagetoken {
  /**
   * The starting page token for listing future changes
   */
  start_page_token: string;
};

export interface ActionInput_google_drive_getcomment {
  /**
   * The ID of the file containing the comment. Example: "1abc123xyz"
   */
  file_id: string;
  /**
   * The ID of the comment to retrieve. Example: "AAAB1p01B9w"
   */
  comment_id: string;
};

export interface ActionOutput_google_drive_getcomment {
  id: string;
  content: string;
  htmlContent: string;
  createdTime: string;
  modifiedTime: string;
  deleted: boolean;
  resolved?: boolean | undefined;
  author: {  displayName: string;
  photoLink: string | null;
  me: boolean;};
  replies: ({  id: string;
  content: string;
  author: {  displayName: string;
  me: boolean;};
  createdTime: string;})[];
};

export interface ActionInput_google_drive_getpermission {
  /**
   * The ID of the file. Example: "1xABCDEF123456"
   */
  file_id: string;
  /**
   * The ID of the permission. Example: "12345678901234567890"
   */
  permission_id: string;
};

export interface ActionOutput_google_drive_getpermission {
  id: string;
  /**
   * The type of the grantee. Valid values are user, group, domain, or anyone.
   */
  type: string;
  /**
   * The role granted by this permission. Valid values are owner, organizer, fileOrganizer, writer, commenter, or reader.
   */
  role: string;
  /**
   * The email address of the user or group this permission refers to.
   */
  email_address?: string | null | undefined;
  /**
   * The domain to which this permission refers.
   */
  domain?: string | null | undefined;
  /**
   * Whether the permission allows the file to be discovered through search.
   */
  allow_file_discovery?: boolean | null | undefined;
  /**
   * A displayable name for users, groups or domains.
   */
  display_name?: string | null | undefined;
  /**
   * A link to the profile photo, if available.
   */
  photo_link?: string | null | undefined;
  /**
   * The time at which this permission will expire (RFC 3339 date-time).
   */
  expiration_time?: string | null | undefined;
  /**
   * Details of the permission, including specific permissions and whether they inherited from a parent.
   */
  permission_details?: ({})[] | undefined;
  /**
   * Whether this permission has been deleted.
   */
  deleted?: boolean | null | undefined;
  /**
   * Whether the account associated with this permission has been deleted.
   */
  pending_owner?: boolean | null | undefined;
  /**
   * Indicates the view for this permission.
   */
  view?: string | null | undefined;
  /**
   * The time at which this permission was created (RFC 3339 date-time).
   */
  created_time?: string | null | undefined;
};

export interface ActionInput_google_drive_getrevision {
  /**
   * The ID of the file. Example: "1abc123xyz"
   */
  file_id: string;
  /**
   * The ID of the revision. Example: "1"
   */
  revision_id: string;
};

export interface ActionOutput_google_drive_getrevision {
  /**
   * The type of resource. Always "drive#revision".
   */
  kind: string;
  /**
   * The ID of the revision.
   */
  id: string;
  /**
   * The MIME type of the revision.
   */
  mimeType: string;
  /**
   * The last time the revision was modified in RFC 3339 format.
   */
  modifiedTime: string;
  /**
   * Whether this revision is marked as keep forever.
   */
  keepForever?: boolean | undefined;
  /**
   * Whether this revision is published.
   */
  published?: boolean | undefined;
  /**
   * A link to the published revision.
   */
  publishedLink?: string | undefined;
  /**
   * Whether this revision is published outside the domain.
   */
  publishedOutsideDomain?: boolean | undefined;
  /**
   * The size of the revision in bytes.
   */
  size?: string | undefined;
  /**
   * The original filename of the revision.
   */
  originalFilename?: string | undefined;
  /**
   * The MD5 checksum of the revision.
   */
  md5Checksum?: string | undefined;
};

export interface ActionInput_google_drive_getshareddrive {
  /**
   * The ID of the shared drive to retrieve. Example: "0ACo-2dj5Ql07Uk9PVA"
   */
  id: string;
};

export interface ActionOutput_google_drive_getshareddrive {
  id: string;
  name: string | null;
  kind: string | null;
  themeId: string | null;
  colorRgb: string | null;
  backgroundImageFile: {} | null;
  capabilities: {} | null;
  restrictions: {} | null;
  hidden: boolean | null;
  createdTime: string | null;
  orgUnitId: string | null;
};

export interface ActionInput_google_drive_hideshareddrive {
  /**
   * The ID of the shared drive to hide. Example: "0ABC123xyz"
   */
  drive_id: string;
};

export interface ActionOutput_google_drive_hideshareddrive {
  id: string;
  name: string | null;
  hidden: boolean;
};

export interface ActionInput_google_drive_listchanges {
  /**
   * The token for continuing a previous list request. Omit for first request, in which case the action will get a start page token automatically.
   */
  page_token?: string | undefined;
  /**
   * The shared drive ID. If specified, changes will be limited to this drive.
   */
  drive_id?: string | undefined;
  /**
   * Whether to include changes from all shared drives. Default: false
   */
  include_items_from_all_drives?: boolean | undefined;
  /**
   * Whether to include changes indicating items have been removed. Default: true
   */
  include_removed?: boolean | undefined;
  /**
   * Maximum number of changes to return per page. Default: 100
   */
  page_size?: number | undefined;
};

export interface ActionOutput_google_drive_listchanges {
  changes: ({  change_type: string | null;
  file: {  id: string;
  name: string | null;
  mime_type: string | null;
  modified_time: string | null;} | null;
  file_id: string;
  removed?: boolean | undefined;
  time: string | null;})[];
  next_page_token: string | null;
  new_start_page_token: string | null;
};

export interface ActionInput_google_drive_listcomments {
  /**
   * The ID of the file to list comments for. Example: "1wwU5Dhr-6_3SHgtSQnXJ7HBPkgW-shalzdc0pfRL-Yk"
   */
  file_id: string;
  /**
   * Pagination cursor from previous response. Omit for first page.
   */
  cursor?: string | undefined;
};

export interface ActionOutput_google_drive_listcomments {
  comments: ({  id: string;
  content: string | null;
  htmlContent: string | null;
  createdTime: string | null;
  modifiedTime: string | null;
  resolved: boolean | null;
  deleted: boolean | null;
  author: {  displayName: string | null;
  kind: string | null;
  me: boolean | null;
  photoLink: string | null;};})[];
  /**
   * The cursor for the next page of comments. Null if there are no more pages.
   */
  next_cursor: string | null;
};

export interface ActionInput_google_drive_listfilesnonunified {
  /**
   * Folder ID to list contents. Omit for root folder.
   */
  folder_id?: string | undefined;
  /**
   * Pagination cursor (pageToken) from previous response. Omit for first page.
   */
  cursor?: string | undefined;
  /**
   * Maximum number of files to return. Default: 100.
   */
  limit?: number | undefined;
  /**
   * Include items from shared drives. Default: false.
   */
  include_shared_drives?: boolean | undefined;
};

export interface ActionOutput_google_drive_listfilesnonunified {
  files: ({  id: string;
  name: string;
  mime_type: string;
  is_folder: boolean;
  parent_id: string | null;
  created_at: string | null;
  modified_at: string | null;
  size: number | null;
  web_view_link: string | null;
  thumbnail_link: string | null;})[];
  /**
   * Cursor for next page. Null if no more pages.
   */
  next_cursor: string | null;
  /**
   * Total number of files in this page.
   */
  total_count: number;
};

export interface ActionInput_google_drive_listpermissions {
  /**
   * The ID of the file to list permissions for. Example: "1AoQyTafvg1p_cqzJTTGmdbMTQ6jolnJ7J_mQBlPcFec"
   */
  file_id: string;
  /**
   * Pagination cursor from previous response. Omit for first page.
   */
  cursor?: string | undefined;
  /**
   * Maximum number of permissions to return per page (1-100). Default: 100
   */
  page_size?: number | undefined;
};

export interface ActionOutput_google_drive_listpermissions {
  permissions: ({  id: string;
  type: string;
  role: string;
  emailAddress?: string | null | undefined;
  displayName?: string | null | undefined;
  domain?: string | null | undefined;})[];
  next_cursor: string | null;
};

export interface ActionInput_google_drive_listshareddrives {
  /**
   * Pagination cursor from previous response. Omit for first page.
   */
  cursor?: string | undefined;
  /**
   * Maximum number of shared drives to return. Default is 10, maximum is 100.
   */
  limit?: number | undefined;
  /**
   * Query string for searching shared drives. Example: "hidden = false"
   */
  query?: string | undefined;
};

export interface ActionOutput_google_drive_listshareddrives {
  drives: ({  id: string;
  name: string;
  colorRgb?: string | undefined;
  backgroundImageLink?: string | undefined;
  kind?: string | undefined;
  hidden?: boolean | undefined;
  capabilities?: {  canAddChildren?: boolean | undefined;
  canChangeCopyRequiresWriterPermissionRestriction?: boolean | undefined;
  canChangeDomainUsersOnlyRestriction?: boolean | undefined;
  canChangeDriveBackground?: boolean | undefined;
  canChangeDriveMembersOnlyRestriction?: boolean | undefined;
  canComment?: boolean | undefined;
  canCopy?: boolean | undefined;
  canDeleteChildren?: boolean | undefined;
  canDeleteDrive?: boolean | undefined;
  canDownload?: boolean | undefined;
  canEdit?: boolean | undefined;
  canListChildren?: boolean | undefined;
  canManageMembers?: boolean | undefined;
  canReadRevisions?: boolean | undefined;
  canRename?: boolean | undefined;
  canRenameDrive?: boolean | undefined;
  canResetDriveRestrictions?: boolean | undefined;
  canShare?: boolean | undefined;
  canTrashChildren?: boolean | undefined;
  canUntrashChildren?: boolean | undefined;
  canViewItemCounts?: boolean | undefined;};
  restrictions?: {  adminManagedRestrictions?: boolean | undefined;
  copyRequiresWriterPermission?: boolean | undefined;
  domainUsersOnly?: boolean | undefined;
  driveMembersOnly?: boolean | undefined;
  sharingFoldersRequiresOrganizerPermission?: boolean | undefined;};})[];
  /**
   * Pagination cursor for the next page of results. Null if this is the last page.
   */
  next_cursor: string | null;
};

export interface ActionInput_google_drive_movefile {
  /**
   * The ID of the file to move. Example: "1mD3ukEAmRqo8u0RF_Cr6IJl9f_uWTYH03vesDhB5Svw"
   */
  file_id: string;
  /**
   * The ID of the current parent folder. Example: "1SpnQKJHqNDh-qhbj_zGD2aIm-G-RKC_k"
   */
  from_folder_id: string;
  /**
   * The ID of the destination folder. Example: "1Bl1rB7hkBbdzmKUka3zSj0bhAK3pGypD"
   */
  to_folder_id: string;
};

export interface ActionOutput_google_drive_movefile {
  id: string;
  name: string | null;
  mimeType: string | null;
  parents: string[];
};

export interface ActionInput_google_drive_unhideshareddrive {
  /**
   * The ID of the shared drive to unhide. Example: "0ABC123xyz"
   */
  drive_id: string;
};

export interface ActionOutput_google_drive_unhideshareddrive {
  id: string;
  name: string | null;
  hidden: boolean | null;
  created_time: string | null;
  kind: string | null;
};

export interface ActionInput_google_drive_updatecomment {
  /**
   * The ID of the file containing the comment. Example: "1mlzflxHXQkoCj-3p1T_O762TNAfGGr_iIb5C9uwnIwk"
   */
  file_id: string;
  /**
   * The ID of the comment to update. Example: "AAAB1pvq854"
   */
  comment_id: string;
  /**
   * The new plain text content of the comment. Example: "Updated comment text"
   */
  content: string;
  /**
   * Whether the comment is resolved. Optional.
   */
  resolved?: boolean | undefined;
};

export interface ActionOutput_google_drive_updatecomment {
  id: string;
  content: string;
  htmlContent: string;
  createdTime: string;
  modifiedTime: string;
  author: {  displayName: string;
  kind: string;
  me: boolean;
  photoLink?: string | undefined;};
  deleted: boolean;
  resolved?: boolean | undefined;
  replies?: ({})[] | undefined;
};

export interface ActionInput_google_drive_updatefile {
  file_id: string;
  name?: string | undefined;
  description?: string | undefined;
  mime_type?: string | undefined;
  starred?: boolean | undefined;
  trashed?: boolean | undefined;
  parents?: string[] | undefined;
  app_properties?: {  [key: string]: string;} | undefined;
  properties?: {  [key: string]: string;} | undefined;
};

export interface ActionOutput_google_drive_updatefile {
  id: string;
  name: string;
  mime_type: string;
  description: string | null;
  starred: boolean;
  trashed: boolean;
  parents: string[];
  created_time: string;
  modified_time: string;
  size: string | null;
  web_view_link: string | null;
};

export interface ActionInput_google_drive_updatepermission {
  /**
   * The ID of the file or shared drive.
   */
  file_id: string;
  /**
   * The ID of the permission.
   */
  permission_id: string;
  /**
   * The new role for the permission.
   */
  role: 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader';
};

export interface ActionOutput_google_drive_updatepermission {
  id: string;
  type: string | null;
  role: string;
  emailAddress: string | null;
  domain: string | null;
  displayName: string | null;
  allowFileDiscovery: boolean | null;
  kind: string | null;
};

export interface ActionInput_google_drive_updateshareddrive {
  /**
   * The ID of the shared drive to update. Example: "0AN1234567890XYZ"
   */
  drive_id: string;
  /**
   * The new name for the shared drive. Example: "Updated Shared Drive"
   */
  name?: string | undefined;
  /**
   * The color of the shared drive as an RGB hex string. Example: "#0000FF"
   */
  color_rgb?: string | undefined;
  /**
   * Restrictions to apply to the shared drive
   */
  restrictions?: {  /**
   * Whether the restrictions are managed by an admin
   */
  admin_managed_restrictions?: boolean | undefined;
  /**
   * Whether the copy operation requires writer permission
   */
  copy_requires_writer_permission?: boolean | undefined;
  /**
   * Whether only domain users can access the shared drive
   */
  domain_users_only?: boolean | undefined;
  /**
   * Whether only drive members can access the shared drive
   */
  drive_members_only?: boolean | undefined;};
};

export interface ActionOutput_google_drive_updateshareddrive {
  id: string;
  name: string | null;
  color_rgb: string | null;
  kind: string;
  created_time: string | null;
  restrictions?: {  admin_managed_restrictions?: boolean | undefined;
  copy_requires_writer_permission?: boolean | undefined;
  domain_users_only?: boolean | undefined;
  drive_members_only?: boolean | undefined;};
};

export interface ActionInput_google_drive_uploaddocument {
  /**
   * The name of the file to create. Example: "document.txt"
   */
  name: string;
  /**
   * The file content as plain text or base64 encoded string
   */
  content: string;
  /**
   * The MIME type of the file. Example: "text/plain", "application/pdf"
   */
  mime_type: string;
  /**
   * Whether the content is base64 encoded. Defaults to false
   */
  is_base64?: boolean | undefined;
  /**
   * The ID of the folder to upload the file into. If not provided, defaults to root. Example: "1a2b3c4d5e6f7g8h"
   */
  folder_id?: string | undefined;
  /**
   * A description of the file
   */
  description?: string | undefined;
};

export interface ActionOutput_google_drive_uploaddocument {
  /**
   * The ID of the created file
   */
  id: string;
  /**
   * The name of the created file
   */
  name: string;
  /**
   * The MIME type of the file
   */
  mime_type: string;
  /**
   * A link for opening the file in a relevant Google editor or viewer
   */
  web_view_link: string | null;
  /**
   * A link for downloading the content of the file in a browser
   */
  web_content_link: string | null;
};
