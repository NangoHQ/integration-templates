import { z } from "zod";

export const AlgoliaContact = z.object({
  createdAt: z.date(),
  taskID: z.number(),
  objectID: z.string()
});

export type AlgoliaContact = z.infer<typeof AlgoliaContact>;

export const AlgoliaCreateContactInput = z.object({
  name: z.string(),
  company: z.string(),
  email: z.string()
});

export type AlgoliaCreateContactInput = z.infer<typeof AlgoliaCreateContactInput>;

export const models = {
  AlgoliaContact: AlgoliaContact,
  AlgoliaCreateContactInput: AlgoliaCreateContactInput
};