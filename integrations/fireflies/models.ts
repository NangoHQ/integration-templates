import { z } from "zod";

export const FirefliesAddtoLiveInput = z.object({
  query: z.string(),
  variables: z.object({})
});

export type FirefliesAddtoLiveInput = z.infer<typeof FirefliesAddtoLiveInput>;

export const FirefliesAddtoLiveResponse = z.object({
  data: z.object({})
});

export type FirefliesAddtoLiveResponse = z.infer<typeof FirefliesAddtoLiveResponse>;

export const models = {
  FirefliesAddtoLiveInput: FirefliesAddtoLiveInput,
  FirefliesAddtoLiveResponse: FirefliesAddtoLiveResponse
};