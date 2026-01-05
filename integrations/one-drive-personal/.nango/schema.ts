export interface OneDriveFileSelection {
  id: string;
  name: string;
  etag: string;
  cTag: string;
  is_folder: boolean;
  mime_type: string | null;
  path: string;
  raw_source: {};
  updated_at: string;
  created_at: string;
  blob_size: number;
  drive_id: string;
};

export interface SyncMetadata_one_drive_personal_userfilesselection {
  fileIds: string[];
};
