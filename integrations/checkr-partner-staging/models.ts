import { z } from "zod";

export const CheckrPartnerStagingAccount = z.object({
  id: z.string(),
  object: z.string(),
  account_deauthorization: z.object({}),
  adverse_action_email: z.string(),
  api_authorized: z.boolean(),
  authorized: z.boolean(),
  available_screenings: z.any().array(),
  billing_email: z.string(),
  company: z.object({}),
  compliance_contact_email: z.string(),
  created_at: z.date(),
  default_compliance_city: z.union([z.string(), z.null()]),
  default_compliance_state: z.union([z.string(), z.null()]),
  geos_required: z.boolean(),
  name: z.string(),
  purpose: z.string(),
  segmentation_enabled: z.boolean(),
  support_email: z.union([z.string(), z.null()]),
  support_phone: z.union([z.string(), z.null()]),
  technical_contact_email: z.string(),
  uri: z.string(),
  uri_name: z.string()
});

export type CheckrPartnerStagingAccount = z.infer<typeof CheckrPartnerStagingAccount>;

export const models = {
  CheckrPartnerStagingAccount: CheckrPartnerStagingAccount
};