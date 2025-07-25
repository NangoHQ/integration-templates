import { z } from "zod";

export const ZohoMailTask = z.object({
  id: z.string(),
  serviceType: z.number(),
  modifiedTime: z.date(),
  resourceId: z.string(),
  attachments: z.any().array(),
  statusStr: z.string(),
  statusValue: z.number(),
  description: z.string(),

  project: z.object({
    name: z.string(),
    id: z.string()
  }),

  isTaskPublished: z.boolean(),
  title: z.string(),
  createdAt: z.date(),
  portalId: z.number(),
  serviceId: z.string(),

  owner: z.object({
    name: z.string(),
    id: z.number()
  }),

  assigneeList: z.string().array(),
  dependency: z.any().array(),
  subtasks: z.any().array(),
  priority: z.string(),
  tags: z.string().array(),
  followers: z.string().array(),
  namespaceId: z.string(),
  dependents: z.string().array(),

  assignee: z.object({
    name: z.string(),
    id: z.number()
  }),

  serviceUniqId: z.number(),
  depUniqId: z.string(),
  status: z.string()
});

export type ZohoMailTask = z.infer<typeof ZohoMailTask>;

export const ZohoMailEmail = z.object({
  id: z.string(),
  summary: z.string(),
  sentDateInGMT: z.string(),
  calendarType: z.number(),
  subject: z.string(),
  messageId: z.string(),
  flagid: z.string(),
  status2: z.string(),
  priority: z.string(),
  hasInline: z.string(),
  toAddress: z.string(),
  folderId: z.string(),
  ccAddress: z.string(),
  hasAttachment: z.string(),
  size: z.string(),
  sender: z.string(),
  receivedTime: z.string(),
  fromAddress: z.string(),
  status: z.string()
});

export type ZohoMailEmail = z.infer<typeof ZohoMailEmail>;

export const ZohoMailSendEmailInput = z.object({
  accountId: z.string(),
  fromAddress: z.string(),
  toAddress: z.string(),
  ccAddress: z.string(),
  bccAddress: z.string(),
  subject: z.string(),
  encoding: z.string(),
  mailFormat: z.string(),
  askReceipt: z.string()
});

export type ZohoMailSendEmailInput = z.infer<typeof ZohoMailSendEmailInput>;

export const ZohoMailSendEmailOutput = z.object({
  status: z.object({}),
  data: z.object({})
});

export type ZohoMailSendEmailOutput = z.infer<typeof ZohoMailSendEmailOutput>;

export const ZohoMailAddUserInput = z.object({
  zoid: z.number(),
  primaryEmailAddress: z.string(),
  password: z.string(),
  displayName: z.string(),
  role: z.string(),
  country: z.string(),
  language: z.string(),
  timeZone: z.string(),
  oneTimePassword: z.boolean(),
  groupMailList: z.string().array()
});

export type ZohoMailAddUserInput = z.infer<typeof ZohoMailAddUserInput>;

export const ZohoMailAddUserOutput = z.object({
  status: z.object({}),
  data: z.object({})
});

export type ZohoMailAddUserOutput = z.infer<typeof ZohoMailAddUserOutput>;

export const models = {
  ZohoMailTask: ZohoMailTask,
  ZohoMailEmail: ZohoMailEmail,
  ZohoMailSendEmailInput: ZohoMailSendEmailInput,
  ZohoMailSendEmailOutput: ZohoMailSendEmailOutput,
  ZohoMailAddUserInput: ZohoMailAddUserInput,
  ZohoMailAddUserOutput: ZohoMailAddUserOutput
};