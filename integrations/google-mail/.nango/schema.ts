export interface SyncMetadata_google_mail_emails {
  backfillPeriodMs: number;
};

export interface GmailEmail {
  id: string;
  sender: string;
  recipients?: string | undefined;
  date: string;
  subject: string;
  body?: string | undefined;
  attachments: ({  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;})[];
  threadId: string;
};

export interface SyncMetadata_google_mail_labels {
};

export interface GmailLabel {
  id: string;
  name: string;
  messageListVisibility: string | null;
  labelListVisibility: string | null;
  type: string;
  messagesTotal: number;
  messagesUnread: number;
  threadsTotal: number;
  threadsUnread: number;
  color: {  textColor: string;
  backgroundColor: string;} | null;
};

export interface ActionInput_google_mail_fetchattachment {
  threadId: string;
  attachmentId: string;
};

export type ActionOutput_google_mail_fetchattachment = string

export interface ActionInput_google_mail_sendemail {
  from: string;
  to: string;
  headers: {  [key: string]: string;};
  subject: string;
  body: string;
};

export interface ActionOutput_google_mail_sendemail {
  id: string;
  threadId: string;
};
