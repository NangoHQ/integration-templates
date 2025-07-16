import { z } from "zod";

export const LinkedinVideoPost = z.object({
  text: z.string(),
  videoURN: z.string(),
  videoTitle: z.string(),
  ownerId: z.string()
});

export type LinkedinVideoPost = z.infer<typeof LinkedinVideoPost>;

export const CreateLinkedInPostWithVideoResponse = z.object({
  succcess: z.boolean()
});

export type CreateLinkedInPostWithVideoResponse = z.infer<typeof CreateLinkedInPostWithVideoResponse>;

export const LinkedInMessageContent = z.object({
  format: z.string(),
  fallback: z.string(),
  formatVersion: z.number(),

  content: z.object({
    string: z.string().optional()
  }).optional()
});

export type LinkedInMessageContent = z.infer<typeof LinkedInMessageContent>;

export const ContentClassification = z.object({
  classification: z.string()
});

export type ContentClassification = z.infer<typeof ContentClassification>;

export const LinkedInActivityData = z.object({
  actor: z.string(),
  createdAt: z.number(),
  attachments: z.string().array(),
  author: z.string(),
  messageContexts: z.any().array(),
  thread: z.string(),
  message: z.string().optional(),
  version: z.number().optional(),
  contentCertificationToken: z.string().optional(),
  extensionContent: z.any().optional()
});

export type LinkedInActivityData = z.infer<typeof LinkedInActivityData>;

export const LinkedInMessage = z.object({
  id: z.number(),
  resourceId: z.string(),
  method: z.string(),
  owner: z.string(),
  actor: z.string(),
  activityId: z.string(),
  processedAt: z.number(),
  capturedAt: z.number(),
  activityStatus: z.string(),
  thread: z.union([z.string(), z.null()]),
  author: z.union([z.string(), z.null()]),
  createdAt: z.union([z.number(), z.null()]),
  isDeleted: z.boolean(),
  configVersion: z.union([z.number(), z.null()]),
  methodName: z.string().optional(),
  processedActivity: z.any().optional(),
  deletedAt: z.number().optional(),
  activityData: LinkedInActivityData,
  content: z.union([LinkedInMessageContent, z.null()]).optional(),
  deliveredAt: z.number().optional(),
  mailbox: z.string().optional(),
  contentClassification: z.union([ContentClassification, z.null()]).optional(),
  attachments: z.string().optional().array(),
  contentUrns: z.string().optional().array(),
  extensionContent: z.any().optional(),
  messageContexts: z.string().optional().array()
});

export type LinkedInMessage = z.infer<typeof LinkedInMessage>;

export const models = {
  LinkedinVideoPost: LinkedinVideoPost,
  CreateLinkedInPostWithVideoResponse: CreateLinkedInPostWithVideoResponse,
  LinkedInMessageContent: LinkedInMessageContent,
  ContentClassification: ContentClassification,
  LinkedInActivityData: LinkedInActivityData,
  LinkedInMessage: LinkedInMessage
};