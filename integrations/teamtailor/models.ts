import { z } from "zod";

export const TeamtailorCandidate = z.object({
  id: z.string(),
  type: z.string(),

  links: z.object({
    self: z.string()
  }),

  attributes: z.object({
    connected: z.boolean(),
    consent_future_jobs_at: z.date(),
    created_at: z.date(),
    updated_at: z.date(),
    email: z.string(),
    facebook_id: z.string(),
    facebook_profile: z.string(),
    first_name: z.string(),
    internal: z.boolean(),
    last_name: z.string(),
    linkedin_profile: z.string(),
    linkedin_uid: z.string(),
    linkedin_url: z.string(),
    original_resume: z.string(),
    phone: z.string(),
    picture: z.string(),
    pitch: z.string(),
    referring_site: z.string(),
    referring_url: z.string(),
    referred: z.boolean(),
    resume: z.string(),
    sourced: z.boolean(),
    tags: z.any().array(),
    unsubscribed: z.boolean()
  }),

  relationships: z.object({
    activities: z.object({
      links: z.object({
        self: z.string(),
        related: z.string()
      })
    }),

    department: z.object({
      links: z.object({
        self: z.string(),
        related: z.string()
      })
    }),

    role: z.object({
      links: z.object({
        self: z.string(),
        related: z.string()
      })
    }),

    regions: z.object({
      links: z.object({
        self: z.string(),
        related: z.string()
      })
    }),

    job_applications: z.object({
      links: z.object({
        self: z.string(),
        related: z.string()
      })
    }),

    questions: z.object({
      links: z.object({
        self: z.string(),
        related: z.string()
      })
    }),

    answers: z.object({
      links: z.object({
        self: z.string(),
        related: z.string()
      })
    }),

    locations: z.object({
      links: z.object({
        self: z.string(),
        related: z.string()
      })
    }),

    uploads: z.object({
      links: z.object({
        self: z.string(),
        related: z.string()
      })
    }),

    custom_field_values: z.object({
      links: z.object({
        self: z.string(),
        related: z.string()
      })
    }),

    partner_results: z.object({
      links: z.object({
        self: z.string(),
        related: z.string()
      })
    })
  })
});

export type TeamtailorCandidate = z.infer<typeof TeamtailorCandidate>;

export const models = {
  TeamtailorCandidate: TeamtailorCandidate
};