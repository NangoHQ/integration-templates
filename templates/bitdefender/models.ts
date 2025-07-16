import { z } from "zod";

export const BitdefenderCompany = z.object({
  id: z.string(),
  name: z.string(),
  type: z.number(),
  country: z.string(),

  subscribedServices: z.object({
    endpoint: z.boolean(),
    exchange: z.boolean(),
    network: z.boolean(),
    sos: z.boolean()
  })
});

export type BitdefenderCompany = z.infer<typeof BitdefenderCompany>;

export const models = {
  BitdefenderCompany: BitdefenderCompany
};