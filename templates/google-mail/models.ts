import { z } from "zod";

export const OptionalBackfillSetting = z.object({
  backfillPeriodMs: z.number()
});

export type OptionalBackfillSetting = z.infer<typeof OptionalBackfillSetting>;

export const Attachments = z.object({
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
  attachmentId: z.string()
});

export type Attachments = z.infer<typeof Attachments>;

export const GmailEmail = z.object({
  id: z.string(),
  sender: z.string(),
  recipients: z.string().optional(),
  date: z.string(),
  subject: z.string(),
  body: z.string().optional(),
  attachments: Attachments.array(),
  threadId: z.string()
});

export type GmailEmail = z.infer<typeof GmailEmail>;

export const GmailEmailInput = z.object({
  from: z.string(),
  to: z.string(),
  headers: z.record(z.string(), z.string()),
  subject: z.string(),
  body: z.string()
});

export type GmailEmailInput = z.infer<typeof GmailEmailInput>;

export const EmailHeader = z.object({
  headerName: z.string(),
  headerValue: z.string()
});

export type EmailHeader = z.infer<typeof EmailHeader>;

export const GmailEmailSentOutput = z.object({
  id: z.string(),
  threadId: z.string()
});

export type GmailEmailSentOutput = z.infer<typeof GmailEmailSentOutput>;

export const DocumentInput = z.object({
  threadId: z.string(),
  attachmentId: z.string()
});

export type DocumentInput = z.infer<typeof DocumentInput>;

export const LabelColor = z.object({
  textColor: z.string(),
  backgroundColor: z.string()
});

export type LabelColor = z.infer<typeof LabelColor>;

export const GmailLabel = z.object({
  id: z.string(),
  name: z.string(),
  messageListVisibility: z.union([z.string(), z.null()]),
  labelListVisibility: z.union([z.string(), z.null()]),
  type: z.string(),
  messagesTotal: z.number(),
  messagesUnread: z.number(),
  threadsTotal: z.number(),
  threadsUnread: z.number(),
  color: z.union([LabelColor, z.null()])
});

export type GmailLabel = z.infer<typeof GmailLabel>;
export const Anonymous_googlemail_action_fetchattachment_output = z.string();
export type Anonymous_googlemail_action_fetchattachment_output = z.infer<typeof Anonymous_googlemail_action_fetchattachment_output>;

export const models = {
  OptionalBackfillSetting: OptionalBackfillSetting,
  Attachments: Attachments,
  GmailEmail: GmailEmail,
  GmailEmailInput: GmailEmailInput,
  EmailHeader: EmailHeader,
  GmailEmailSentOutput: GmailEmailSentOutput,
  DocumentInput: DocumentInput,
  LabelColor: LabelColor,
  GmailLabel: GmailLabel,
  Anonymous_googlemail_action_fetchattachment_output: Anonymous_googlemail_action_fetchattachment_output
};
