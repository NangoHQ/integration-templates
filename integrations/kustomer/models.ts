import { z } from "zod";

export const KustomerConversation = z.object({
  type: z.string(),
  id: z.string(),
  attributes: z.object({}),
  relationships: z.object({}),
  links: z.object({})
});

export type KustomerConversation = z.infer<typeof KustomerConversation>;

export const models = {
  KustomerConversation: KustomerConversation
};