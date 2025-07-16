import { z } from "zod";

export const User = z.object({
  id: z.number(),
  username: z.string(),
  name: z.string(),
  admin: z.boolean()
});

export type User = z.infer<typeof User>;

export const CreateCategory = z.object({
  name: z.string(),
  color: z.string().optional(),
  text_color: z.string().optional(),
  parent_category_id: z.string().optional(),
  slug: z.string().optional(),
  search_priority: z.string().optional()
});

export type CreateCategory = z.infer<typeof CreateCategory>;

export const Category = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  description: z.union([z.string(), z.null()]),
  slug: z.string()
});

export type Category = z.infer<typeof Category>;

export const CreateTopic = z.object({
  title: z.string(),
  category: z.number(),
  raw: z.string()
});

export type CreateTopic = z.infer<typeof CreateTopic>;

export const Topic = z.object({
  id: z.string(),
  name: z.string(),
  content: z.string()
});

export type Topic = z.infer<typeof Topic>;

export const TopicStatus = z.object({
  id: z.string(),

  status: z.union([
    z.literal("closed"),
    z.literal("pinned"),
    z.literal("pinned_globally"),
    z.literal("archived"),
    z.literal("visible")
  ]),

  enabled: z.union([z.any(), z.any()]),
  until: z.string()
});

export type TopicStatus = z.infer<typeof TopicStatus>;

export const TopicStatusUpdated = z.object({
  success: z.string(),
  result: z.string()
});

export type TopicStatusUpdated = z.infer<typeof TopicStatusUpdated>;

export const models = {
  User: User,
  CreateCategory: CreateCategory,
  Category: Category,
  CreateTopic: CreateTopic,
  Topic: Topic,
  TopicStatus: TopicStatus,
  TopicStatusUpdated: TopicStatusUpdated
};