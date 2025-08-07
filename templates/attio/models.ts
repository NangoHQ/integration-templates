import { z } from "zod";

export const AttioEmailAddress = z.object({
  email: z.string(),
  domain: z.string()
});

export type AttioEmailAddress = z.infer<typeof AttioEmailAddress>;

export const AttioPhoneNumber = z.object({
  number: z.string(),
  country_code: z.string()
});

export type AttioPhoneNumber = z.infer<typeof AttioPhoneNumber>;

export const AttioPersonLocation = z.object({
  line_1: z.string().optional(),
  line_2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country_code: z.string().optional()
});

export type AttioPersonLocation = z.infer<typeof AttioPersonLocation>;

export const AttioSocialLink = z.object({
  linkedin: z.string().array().optional(),
  twitter: z.string().array().optional(),
  facebook: z.string().array().optional(),
  instagram: z.string().array().optional(),
  angellist: z.string().array().optional()
});

export type AttioSocialLink = z.infer<typeof AttioSocialLink>;

export const AttioAttribute = z.object({
  active_from: z.string(),
  active_until: z.union([z.string(), z.null()]),

  created_by_actor: z.object({
    type: z.string(),
    id: z.union([z.string(), z.null()])
  })
});

export type AttioAttribute = z.infer<typeof AttioAttribute>;

export const AttioAttributeWithValue = z.object({
  active_from: z.string(),
  active_until: z.union([z.string(), z.null()]),

  created_by_actor: z.object({
    type: z.string(),
    id: z.union([z.string(), z.null()])
  }),

  value: z.string(),
  attribute_type: z.string()
});

export type AttioAttributeWithValue = z.infer<typeof AttioAttributeWithValue>;

export const AttioPerson = z.object({
  id: z.string(),
  workspace_id: z.string(),
  created_at: z.string(),
  web_url: z.string(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  full_name: z.string().optional(),
  email_addresses: AttioEmailAddress.array().optional(),
  phone_numbers: AttioPhoneNumber.array().optional(),
  job_title: AttioAttributeWithValue.array().optional(),
  company_id: z.string().optional(),
  description: AttioAttribute.array().optional(),
  avatar_url: AttioAttribute.array().optional(),
  social_links: AttioSocialLink.optional(),
  location: AttioPersonLocation.optional()
});

export type AttioPerson = z.infer<typeof AttioPerson>;

export const AttioDomain = z.object({
  domain: z.string(),
  root_domain: z.string()
});

export type AttioDomain = z.infer<typeof AttioDomain>;

export const AttioCompanyLocation = z.object({
  country_code: z.string().optional(),
  line_1: z.union([z.string(), z.null()]).optional(),
  line_2: z.union([z.string(), z.null()]).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional()
});

export type AttioCompanyLocation = z.infer<typeof AttioCompanyLocation>;

export const AttioCompany = z.object({
  id: z.string(),
  workspace_id: z.string(),
  created_at: z.string(),
  web_url: z.string(),
  name: z.string().optional(),
  domains: AttioDomain.array().optional(),
  description: z.string().optional(),
  team_member_ids: z.string().array().optional(),
  location: AttioCompanyLocation.optional(),
  categories: z.string().array().optional(),
  logo_url: z.string().optional(),
  twitter_follower_count: z.number().optional(),
  foundation_date: z.string().optional(),
  estimated_arr_usd: z.number().optional(),
  social_links: AttioSocialLink.optional()
});

export type AttioCompany = z.infer<typeof AttioCompany>;

export const AttioDeal = z.object({
  id: z.string(),
  workspace_id: z.string(),
  created_at: z.string(),
  web_url: z.string(),
  name: z.string().optional(),
  stage: z.string().optional(),
  stage_id: z.string().optional(),
  owner_id: z.string().optional(),
  value: z.number().optional(),
  currency: z.string().optional(),
  associated_people_ids: z.string().array().optional(),
  associated_company_id: z.string().optional()
});

export type AttioDeal = z.infer<typeof AttioDeal>;

export const models = {
  AttioEmailAddress: AttioEmailAddress,
  AttioPhoneNumber: AttioPhoneNumber,
  AttioPersonLocation: AttioPersonLocation,
  AttioSocialLink: AttioSocialLink,
  AttioAttribute: AttioAttribute,
  AttioAttributeWithValue: AttioAttributeWithValue,
  AttioPerson: AttioPerson,
  AttioDomain: AttioDomain,
  AttioCompanyLocation: AttioCompanyLocation,
  AttioCompany: AttioCompany,
  AttioDeal: AttioDeal
};