export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface SyncMetadata_box_files {
  files: string[];
  folders: string[];
};

export interface BoxDocument {
  id: string;
  name: string;
  download_url: string;
  modified_at: string;
};

export interface SyncMetadata_box_folders {
};

export interface Folder {
  id: string;
  url: string;
  title: string;
  mimeType: string;
  updatedAt: string;
};

export interface SyncMetadata_box_users {
};

export interface ActionInput_box_createuser {
  firstName: string;
  lastName: string;
  email: string;
  address?: string | undefined;
  can_see_managed_users?: boolean | undefined;
  external_app_user_id?: string | undefined;
  is_exempt_from_device_limits?: boolean | undefined;
  is_exempt_from_login_verification?: boolean | undefined;
  is_external_collab_restricted?: boolean | undefined;
  is_platform_access_only?: boolean | undefined;
  is_sync_enabled?: boolean | undefined;
  job_title?: string | undefined;
  language?: string | undefined;
  phone?: string | undefined;
  role?: 'coadmin' | 'user' | undefined;
  space_amount?: number | undefined;
  status?: 'active' | 'inactive' | 'cannot_delete_edit' | 'cannot_delete_edit_upload' | undefined;
  timezone?: string | undefined;
  tracking_codes: ({  type?: 'tracking_code' | undefined;
  name?: string | undefined;
  value?: string | undefined;})[];
};

export interface ActionOutput_box_createuser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export interface ActionInput_box_deleteuser {
  id: string;
  force?: boolean | undefined;
  notify?: boolean | undefined;
};

export interface ActionOutput_box_deleteuser {
  success: boolean;
};

export interface ActionInput_box_foldercontent {
  id?: string | undefined;
  marker?: string | undefined;
};

export interface ActionOutput_box_foldercontent {
  files: ({  id: string;
  name: string;
  download_url: string;
  modified_at: string;})[];
  folders: ({  id: string;
  name: string;
  modified_at: string;
  url: string | null;})[];
  next_marker?: string | undefined;
};
