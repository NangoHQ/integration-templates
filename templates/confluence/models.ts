import { z } from "zod";

export const ConfluenceSpace = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  type: z.string(),
  status: z.string(),
  authorId: z.string(),
  createdAt: z.string(),
  homepageId: z.string(),
  description: z.string()
});

export type ConfluenceSpace = z.infer<typeof ConfluenceSpace>;

export const Storage = z.object({
  value: z.string(),
  representation: z.literal("storage")
});

export type Storage = z.infer<typeof Storage>;

export const ConfluencePage = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  authorId: z.string(),
  createdAt: z.string(),
  spaceId: z.string(),
  parentId: z.union([z.string(), z.null()]).optional(),
  parentType: z.union([z.string(), z.null()]),
  position: z.number(),

  version: z.object({
    createdAt: z.string(),
    message: z.string(),
    number: z.number(),
    minorEdit: z.boolean(),
    authorId: z.string()
  }),

  body: z.object({
    storage: Storage
  })
});

export type ConfluencePage = z.infer<typeof ConfluencePage>;

export const models = {
  ConfluenceSpace: ConfluenceSpace,
  Storage: Storage,
  ConfluencePage: ConfluencePage
};