import { z } from "zod";

export const User = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  title: z.union([z.string(), z.null()])
});

export type User = z.infer<typeof User>;

export const GongCallTranscriptInput = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  workspace_id: z.string().optional(),
  call_id: z.string().array().optional(),
  cursor: z.string().optional()
});

export type GongCallTranscriptInput = z.infer<typeof GongCallTranscriptInput>;

export const GongCallTranscript = z.object({
  call_id: z.string(),

  transcript: z.array(z.object({
    speaker_id: z.string(),
    topic: z.union([z.string(), z.null()]),

    sentences: z.array(z.object({
      start: z.number(),
      end: z.number(),
      text: z.string()
    }))
  }))
});

export type GongCallTranscript = z.infer<typeof GongCallTranscript>;

export const GongCallTranscriptOutput = z.object({
  next_cursor: z.string().optional(),
  transcript: GongCallTranscript.array()
});

export type GongCallTranscriptOutput = z.infer<typeof GongCallTranscriptOutput>;

export const GongCallContextObject = z.object({
  object_type: z.union([z.string(), z.null()]),
  object_id: z.union([z.string(), z.null()]),

  fields: z.array(z.object({
    name: z.string(),
    value: z.string()
  }))
});

export type GongCallContextObject = z.infer<typeof GongCallContextObject>;

export const GongCallContext = z.object({
  system: z.union([z.string(), z.null()]),
  objects: GongCallContextObject.optional()
});

export type GongCallContext = z.infer<typeof GongCallContext>;

export const GongCallOutput = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
  scheduled: z.string(),
  started: z.string(),
  duration: z.number(),

  direction: z.union([
    z.literal("Inbound"),
    z.literal("Outbound"),
    z.literal("Conference"),
    z.literal("Unknown")
  ]),

  scope: z.union([z.literal("Internal"), z.literal("External"), z.literal("Unknown")]),
  media: z.string(),
  language: z.string(),
  workspace_id: z.string(),
  purpose: z.union([z.string(), z.null()]),
  meeting_url: z.string(),
  is_private: z.boolean(),
  calendar_event_id: z.union([z.string(), z.null()]),
  context: GongCallContext.optional(),

  parties: z.array(z.object({
    id: z.string(),
    email_address: z.string().optional(),
    name: z.string().optional(),
    title: z.string().optional(),
    user_id: z.string().optional(),
    speaker_id: z.union([z.string(), z.null()]),
    affiliation: z.union([z.literal("Internal"), z.literal("External"), z.literal("Unknown")]),
    methods: z.string().array()
  })),

  interaction: z.object({
    speakers: z.array(z.object({
      id: z.string(),
      user_id: z.string(),
      talkTime: z.number()
    })),

    interaction_stats: z.array(z.object({
      name: z.string(),
      value: z.number()
    })),

    video: z.array(z.object({
      name: z.string(),
      duration: z.number()
    })),

    questions: z.object({
      company_count: z.number(),
      non_company_count: z.number()
    })
  }),

  collaboration: z.object({
    public_comments: z.array(z.object({
      id: z.string(),
      audio_start_time: z.number(),
      audio_end_time: z.number(),
      commenter_user_id: z.string(),
      comment: z.string(),
      posted: z.string(),
      during_call: z.boolean()
    }))
  }),

  media_urls: z.object({
    audio_url: z.string(),
    video_url: z.string().optional()
  })
});

export type GongCallOutput = z.infer<typeof GongCallOutput>;

export const GongConnectionMetadata = z.object({
  backfillPeriodMs: z.number().optional(),
  lastSyncBackfillPeriod: z.number().optional()
});

export type GongConnectionMetadata = z.infer<typeof GongConnectionMetadata>;

export const ActionResponseError = z.object({
  message: z.string()
});

export type ActionResponseError = z.infer<typeof ActionResponseError>;

export const GongCallTranscriptMetadata = z.object({
  backfillPeriodMs: z.number().optional(),
  lastSyncBackfillPeriod: z.number().optional(),
  callIds: z.array(z.string()).optional(),
  workspaceId: z.string().optional()
});

export type GongCallTranscriptMetadata = z.infer<typeof GongCallTranscriptMetadata>;

export const GongCallTranscriptSyncOutput = z.object({
  id: z.string(),

  transcript: z.array(z.object({
    speaker_id: z.string(),
    topic: z.union([z.string(), z.null()]),

    sentences: z.array(z.object({
      start: z.number(),
      end: z.number(),
      text: z.string()
    }))
  }))
});

export type GongCallTranscriptSyncOutput = z.infer<typeof GongCallTranscriptSyncOutput>;

export const models = {
  User: User,
  GongCallTranscriptInput: GongCallTranscriptInput,
  GongCallTranscript: GongCallTranscript,
  GongCallTranscriptOutput: GongCallTranscriptOutput,
  GongCallContextObject: GongCallContextObject,
  GongCallContext: GongCallContext,
  GongCallOutput: GongCallOutput,
  GongConnectionMetadata: GongConnectionMetadata,
  ActionResponseError: ActionResponseError,
  GongCallTranscriptMetadata: GongCallTranscriptMetadata,
  GongCallTranscriptSyncOutput: GongCallTranscriptSyncOutput
};
