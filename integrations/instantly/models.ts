import { z } from "zod";

export const InstantlySetCampaignNameResponse = z.object({
  status: z.string()
});

export type InstantlySetCampaignNameResponse = z.infer<typeof InstantlySetCampaignNameResponse>;

export const InstantlySetCampaignNameInput = z.object({
  campaign_id: z.string(),
  name: z.string()
});

export type InstantlySetCampaignNameInput = z.infer<typeof InstantlySetCampaignNameInput>;

export const models = {
  InstantlySetCampaignNameResponse: InstantlySetCampaignNameResponse,
  InstantlySetCampaignNameInput: InstantlySetCampaignNameInput
};