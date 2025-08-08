import { z } from "zod";

export const WildixPbxColleague = z.object({
  id: z.string(),
  name: z.string(),
  extension: z.string(),
  email: z.string(),
  mobilePhone: z.string(),
  licenseType: z.string(),
  language: z.string()
});

export type WildixPbxColleague = z.infer<typeof WildixPbxColleague>;

export const models = {
  WildixPbxColleague: WildixPbxColleague
};