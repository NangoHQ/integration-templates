import { z } from "zod";

export const NextCloudUser = z.object({
  enabled: z.boolean(),
  id: z.string(),
  lastLogin: z.number(),
  backend: z.string(),
  subadmin: z.string().array(),

  quota: z.object({
    free: z.number(),
    used: z.number(),
    total: z.number(),
    relative: z.number(),
    quota: z.number()
  }),

  manager: z.string(),
  avatarScope: z.string(),
  email: z.string(),
  emailScope: z.string(),
  additional_mail: z.string().array(),
  additional_mailScope: z.string().array(),
  displayname: z.string(),
  display_name: z.string(),
  displaynameScope: z.string(),
  phone: z.string(),
  phoneScope: z.string(),
  address: z.string(),
  addressScope: z.string(),
  website: z.string(),
  websiteScope: z.string(),
  twitter: z.string(),
  twitterScope: z.string(),
  fediverse: z.string(),
  fediverseScope: z.string(),
  organisation: z.string(),
  organisationScope: z.string(),
  role: z.string(),
  roleScope: z.string(),
  headline: z.string(),
  headlineScope: z.string(),
  biography: z.string(),
  biographyScope: z.string(),
  profile_enabled: z.string(),
  profile_enabledScope: z.string(),
  groups: z.string().array(),
  language: z.string(),
  locale: z.string(),
  notify_email: z.boolean(),

  backendCapabilities: z.object({
    setDisplayName: z.boolean(),
    setPassword: z.boolean()
  })
});

export type NextCloudUser = z.infer<typeof NextCloudUser>;

export const models = {
  NextCloudUser: NextCloudUser
};