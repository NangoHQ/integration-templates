import { z } from "zod";

export const PipeDriveActivity = z.object({
  id: z.number(),
  done: z.boolean(),
  type: z.string(),
  duration: z.date(),
  subject: z.string(),
  company_id: z.number(),
  user_id: z.number(),
  conference_meeting_client: z.string(),
  conference_meeting_url: z.string(),
  conference_meeting_id: z.string(),
  due_date: z.date(),
  due_time: z.date(),
  busy_flag: z.boolean(),
  add_time: z.date(),
  marked_as_done_time: z.date(),
  public_description: z.string(),
  location: z.string(),
  org_id: z.number(),
  person_id: z.number(),
  deal_id: z.number(),
  active_flag: z.boolean(),
  update_time: z.date(),
  update_user_id: z.number(),
  source_timezone: z.string(),
  lead_id: z.string(),
  location_subpremise: z.string(),
  location_street_number: z.string(),
  location_route: z.string(),
  location_sublocality: z.string(),
  location_locality: z.string(),
  location_admin_area_level_1: z.string(),
  location_admin_area_level_2: z.string(),
  location_country: z.string(),
  location_postal_code: z.string(),
  location_formatted_address: z.string(),
  project_id: z.number()
});

export type PipeDriveActivity = z.infer<typeof PipeDriveActivity>;

export const PipeDriveDeal = z.object({
  id: z.number(),
  creator_user_id: z.number(),
  user_id: z.number(),
  person_id: z.number(),
  org_id: z.number(),
  stage_id: z.number(),
  title: z.string(),
  value: z.number(),
  currency: z.string(),
  add_time: z.date(),
  update_time: z.date(),
  status: z.string(),
  probability: z.string(),
  lost_reason: z.string(),
  visible_to: z.string(),
  close_time: z.date(),
  pipeline_id: z.number(),
  won_time: z.date(),
  lost_time: z.date(),
  expected_close_date: z.date(),
  label: z.string()
});

export type PipeDriveDeal = z.infer<typeof PipeDriveDeal>;

export const PipeDriveOrganization = z.object({
  id: z.number(),
  owner_id: z.number(),
  name: z.string(),
  active_flag: z.boolean(),
  update_time: z.date(),
  delete_time: z.date(),
  add_time: z.date(),
  visible_to: z.string(),
  label: z.number(),
  address: z.number(),
  address_subpremise: z.string(),
  address_street_number: z.string(),
  address_route: z.string(),
  address_sublocality: z.string(),
  address_locality: z.string(),
  address_admin_area_level_1: z.string(),
  address_admin_area_level_2: z.string(),
  address_country: z.string(),
  address_postal_code: z.string(),
  address_formatted_address: z.string(),
  cc_email: z.string()
});

export type PipeDriveOrganization = z.infer<typeof PipeDriveOrganization>;

export const PipeDrivePerson = z.object({
  id: z.number(),
  active_flag: z.boolean(),
  owner_id: z.number(),
  org_id: z.number(),
  name: z.string(),
  phone: z.string().array(),
  email: z.string().array(),
  update_time: z.date(),
  delete_time: z.date(),
  add_time: z.date(),
  visible_to: z.string(),
  picture_id: z.number(),
  label: z.number(),
  cc_email: z.string()
});

export type PipeDrivePerson = z.infer<typeof PipeDrivePerson>;

export const models = {
  PipeDriveActivity: PipeDriveActivity,
  PipeDriveDeal: PipeDriveDeal,
  PipeDriveOrganization: PipeDriveOrganization,
  PipeDrivePerson: PipeDrivePerson
};