import { z } from "zod";

export const Metadata = z.object({
  orgsToSync: z.string().array(),
  channelsLastSyncDate: z.object({}).catchall(z.string()).optional(),
  chatsLastSyncDate: z.object({}).catchall(z.string()).optional()
});

export type Metadata = z.infer<typeof Metadata>;

export const OrganizationalUnit = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.union([z.string(), z.null()]),
  deletedAt: z.union([z.string(), z.null()]),
  description: z.union([z.string(), z.null()]),
  path: z.union([z.string(), z.null()]),
  parentPath: z.union([z.string(), z.null()]),
  parentId: z.union([z.string(), z.null()])
});

export type OrganizationalUnit = z.infer<typeof OrganizationalUnit>;

export const User = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.union([z.string(), z.null()]),
  givenName: z.union([z.string(), z.null()]),
  familyName: z.union([z.string(), z.null()]),
  picture: z.union([z.string(), z.null()]),
  type: z.string(),
  createdAt: z.union([z.string(), z.null()]),
  deletedAt: z.union([z.string(), z.null()]),

  phone: z.object({
    value: z.union([z.string(), z.null()]),
    type: z.union([z.string(), z.null()])
  }),

  organizationId: z.union([z.string(), z.null()]),
  organizationPath: z.union([z.string(), z.null()]),
  isAdmin: z.union([z.boolean(), z.null()]),
  department: z.union([z.string(), z.null()])
});

export type User = z.infer<typeof User>;

export const TeamsMessageAttachment = z.object({
  id: z.string(),
  contentType: z.string(),
  contentUrl: z.union([z.string(), z.null()]),
  name: z.union([z.string(), z.null()]),
  thumbnailUrl: z.union([z.string(), z.null()])
});

export type TeamsMessageAttachment = z.infer<typeof TeamsMessageAttachment>;

export const TeamsMessageReaction = z.object({
  reactionType: z.string(),
  createdDateTime: z.string(),

  user: z.object({
    id: z.string(),
    displayName: z.union([z.string(), z.null()]),
    email: z.union([z.string(), z.null()])
  })
});

export type TeamsMessageReaction = z.infer<typeof TeamsMessageReaction>;

export const TeamsMessageReply = z.object({
  id: z.string(),
  content: z.union([z.string(), z.null()]),
  createdDateTime: z.string(),

  from: z.object({
    user: z.object({
      id: z.union([z.string(), z.null()]),
      displayName: z.union([z.string(), z.null()]),
      email: z.union([z.string(), z.null()])
    })
  })
});

export type TeamsMessageReply = z.infer<typeof TeamsMessageReply>;

export const TeamsMessage = z.object({
  id: z.string(),
  channelId: z.union([z.string(), z.null()]),
  chatId: z.union([z.string(), z.null()]),
  content: z.union([z.string(), z.null()]),
  createdDateTime: z.string(),
  lastModifiedDateTime: z.union([z.string(), z.null()]),
  deletedDateTime: z.union([z.string(), z.null()]),

  from: z.object({
    user: z.object({
      id: z.union([z.string(), z.null()]),
      displayName: z.union([z.string(), z.null()]),
      email: z.union([z.string(), z.null()])
    })
  }),

  importance: z.union([z.string(), z.null()]),
  messageType: z.string(),
  subject: z.union([z.string(), z.null()]),
  webUrl: z.union([z.string(), z.null()]),
  attachments: z.union([TeamsMessageAttachment.array(), z.null()]),
  reactions: z.union([TeamsMessageReaction.array(), z.null()]),
  replies: z.union([TeamsMessageReply.array(), z.null()]),
  raw_json: z.string()
});

export type TeamsMessage = z.infer<typeof TeamsMessage>;

export const models = {
  Metadata: Metadata,
  OrganizationalUnit: OrganizationalUnit,
  User: User,
  TeamsMessageAttachment: TeamsMessageAttachment,
  TeamsMessageReaction: TeamsMessageReaction,
  TeamsMessageReply: TeamsMessageReply,
  TeamsMessage: TeamsMessage
};