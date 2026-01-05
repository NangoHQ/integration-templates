export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface SyncMetadata_gong_calltranscripts {
  backfillPeriodMs?: number | undefined;
  lastSyncBackfillPeriod?: number | undefined;
  callIds?: string[] | undefined;
  workspaceId?: string | undefined;
};

export interface GongCallTranscriptSyncOutput {
  id: string;
  transcript: ({  speaker_id: string;
  topic: string | null;
  sentences: ({  start: number;
  end: number;
  text: string;})[];})[];
};

export interface SyncMetadata_gong_calls {
  backfillPeriodMs?: number | undefined;
  lastSyncBackfillPeriod?: number | undefined;
};

export interface GongCallOutput {
  id: string;
  url: string;
  title: string;
  scheduled: string;
  started: string;
  duration: number;
  direction: 'Inbound' | 'Outbound' | 'Conference' | 'Unknown';
  scope: 'Internal' | 'External' | 'Unknown';
  media: string;
  language: string;
  workspace_id: string;
  purpose: string | null;
  meeting_url: string;
  is_private: boolean;
  calendar_event_id: string | null;
  context?: {  system: string | null;
  objects?: {  object_type: string | null;
  object_id: string | null;
  fields: ({  name: string;
  value: string;})[];} | undefined;};
  parties: ({  id: string;
  email_address?: string | undefined;
  name?: string | undefined;
  title?: string | undefined;
  user_id?: string | undefined;
  speaker_id: string | null;
  affiliation: 'Internal' | 'External' | 'Unknown';
  methods: string[];})[];
  interaction: {  speakers: ({  id: string;
  user_id: string;
  talkTime: number;})[];
  interaction_stats: ({  name: string;
  value: number;})[];
  video: ({  name: string;
  duration: number;})[];
  questions: {  company_count: number;
  non_company_count: number;};};
  collaboration: {  public_comments: ({  id: string;
  audio_start_time: number;
  audio_end_time: number;
  commenter_user_id: string;
  comment: string;
  posted: string;
  during_call: boolean;})[];};
  media_urls: {  audio_url: string;
  video_url?: string | undefined;};
};

export interface SyncMetadata_gong_users {
};

export interface ActionInput_gong_fetchcalltranscripts {
  from?: string | undefined;
  to?: string | undefined;
  workspace_id?: string | undefined;
  call_id?: string[] | undefined;
  cursor?: string | undefined;
};

export interface ActionOutput_gong_fetchcalltranscripts {
  next_cursor?: string | undefined;
  transcript: ({  call_id: string;
  transcript: ({  speaker_id: string;
  topic: string | null;
  sentences: ({  start: number;
  end: number;
  text: string;})[];})[];})[];
};
