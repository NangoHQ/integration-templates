export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface SyncMetadata_zoom_meetings {
};

export interface Meeting {
  id: string;
  topic: string;
  startTime: string;
  duration: number;
  timezone: string;
  joinUrl: string;
  createdAt: string;
};

export interface SyncMetadata_zoom_recordingfiles {
  backfillPeriodDays: number;
};

export interface RecordingFile {
  id: string;
  deletedTime?: string | undefined;
  downloadUrl: string;
  filePath?: string | undefined;
  fileSize: number;
  fileType: 'MP4' | 'M4A' | 'CHAT' | 'TRANSCRIPT' | 'CSV' | 'TB' | 'CC' | 'CHAT_MESSAGE' | 'SUMMARY' | 'TIMELINE';
  fileExtension: 'MP4' | 'M4A' | 'TXT' | 'VTT' | 'CSV' | 'JSON' | 'JPG';
  meetingId: string;
  playUrl?: string | undefined;
  recordingEnd: string;
  recordingStart: string;
  recordingType: 'shared_screen_with_speaker_view(CC)' | 'shared_screen_with_speaker_view' | 'shared_screen_with_gallery_view' | 'active_speaker' | 'gallery_view' | 'shared_screen' | 'audio_only' | 'audio_transcript' | 'chat_file' | 'poll' | 'host_video' | 'closed_caption' | 'timeline' | 'thumbnail' | 'audio_interpretation' | 'summary' | 'summary_next_steps' | 'summary_smart_chapters' | 'sign_interpretation' | 'production_studio';
  status: 'completed';
  autoDelete?: boolean | undefined;
  autoDeleteDate?: string | undefined;
  playPasscode: string;
};

export interface SyncMetadata_zoom_users {
};

export interface ActionInput_zoom_createmeeting {
  topic: string;
  type: 'instant' | 'scheduled' | 'recurringNoFixed' | 'recurring' | 'screenShareOnly';
  agenda?: string | undefined;
  default_password?: boolean | undefined;
  duration?: number | undefined;
  password?: string | undefined;
  pre_schedule?: boolean | undefined;
  recurrence?: {  end_date_time?: string | undefined;
  end_times?: number | undefined;
  monthly_day?: number | undefined;
  monthly_week?: number | undefined;
  monthly_week_day?: number | undefined;
  repeat_interval?: number | undefined;
  type?: 'daily' | 'weekly' | 'monthly' | undefined;
  weekly_days?: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | undefined;};
  settings?: {  host_video?: boolean | undefined;
  participant_video?: boolean | undefined;
  join_before_host?: boolean | undefined;
  mute_upon_entry?: boolean | undefined;
  approval_type?: 'automatic' | 'manually' | 'notRequired' | undefined;
  registration_type?: 'registerOnceAttendAny' | 'registerEveryTime' | 'registerOnceSelectOccurrences' | undefined;
  audio?: 'both' | 'telephony' | 'voip' | 'thirdParty' | undefined;
  auto_recording?: 'local' | 'cloud' | 'none' | undefined;
  waiting_room: boolean;};
  schedule_for?: string | undefined;
  start_time?: string | undefined;
  template_id?: string | undefined;
  timezone?: string | undefined;
};

export interface ActionOutput_zoom_createmeeting {
  id: string;
  topic: string;
  startTime: string;
  duration: number;
  timezone: string;
  joinUrl: string;
  createdAt: string;
};

export interface ActionInput_zoom_createuser {
  firstName: string;
  lastName: string;
  email: string;
  action?: 'create' | 'autoCreate' | 'custCreate' | 'ssoCreate' | undefined;
  display_name?: string | undefined;
  type?: 'basic' | 'licensed' | 'UnassignedWithoutMeetingsBasic' | 'None' | undefined;
};

export interface ActionOutput_zoom_createuser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface ActionInput_zoom_deletemeeting {
  id: string;
};

export interface ActionOutput_zoom_deletemeeting {
  success: boolean;
};

export interface ActionInput_zoom_deleteuser {
  id: string;
};

export interface ActionOutput_zoom_deleteuser {
  success: boolean;
};

export type ActionInput_zoom_whoami = void

export interface ActionOutput_zoom_whoami {
  id: string;
  email: string;
};
