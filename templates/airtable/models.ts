import { z } from "zod";

export const SuccessResponse = z.object({
  success: z.boolean()
});

export type SuccessResponse = z.infer<typeof SuccessResponse>;

export const TableView = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string()
});

export type TableView = z.infer<typeof TableView>;

export const TableField = z.object({
  id: z.string(),
  description: z.string(),
  name: z.string(),
  type: z.string(),
  options: z.object({}).catchall(z.any()).optional()
});

export type TableField = z.infer<typeof TableField>;

export const Table = z.object({
  baseId: z.string(),
  baseName: z.string(),
  id: z.string(),
  name: z.string(),
  views: TableView.array(),
  fields: TableField.array(),
  primaryFieldId: z.string()
});

export type Table = z.infer<typeof Table>;

export const Base = z.object({
  id: z.string(),
  name: z.string(),

  permissionLevel: z.union([
    z.literal("none"),
    z.literal("read"),
    z.literal("comment"),
    z.literal("edit"),
    z.literal("create")
  ])
});

export type Base = z.infer<typeof Base>;

export const BaseId = z.object({
  baseId: z.string()
});

export type BaseId = z.infer<typeof BaseId>;

export const WebhookSpecification = z.object({
  options: z.object({
    filters: z.object({
      recordChangeScope: z.string().optional(),
      dataTypes: z.string().array(),
      changeTypes: z.string().optional().array(),
      fromSources: z.string().optional().array(),

      sourceOptions: z.object({
        formPageSubmission: z.object({
          pageId: z.string()
        }).optional(),

        formSubmission: z.object({
          viewId: z.string()
        }).optional()
      }).optional(),

      watchDataInFieldIds: z.string().optional().array(),
      watchSchemasOfFieldIds: z.string().optional().array()
    }),

    includes: z.object({
      includeCellValuesInFieldIds: z.union([z.string().array(), z.literal("all")]).optional(),
      "includePreviousCellValues:": z.boolean().optional(),
      includePreviousFieldDefinitions: z.boolean().optional()
    }).optional()
  })
});

export type WebhookSpecification = z.infer<typeof WebhookSpecification>;

export const NotificationResult = z.object({
  success: z.boolean(),

  error: z.object({
    message: z.string()
  }).optional(),

  completionTimestamp: z.string().optional(),
  durationMs: z.number().optional(),
  retryNumber: z.number().optional(),
  willBeRetried: z.boolean().optional()
});

export type NotificationResult = z.infer<typeof NotificationResult>;

export const Webhook = z.object({
  id: z.string(),
  areNotificationsEnabled: z.boolean(),
  cursorForNextPayload: z.number(),
  isHookEnabled: z.boolean(),
  lastSuccessfulNotificationTime: z.union([z.string(), z.null()]),
  expirationTime: z.string().optional(),
  specification: WebhookSpecification,
  lastNotificationResult: z.union([NotificationResult, z.null()])
});

export type Webhook = z.infer<typeof Webhook>;

export const WebhookResponse = z.object({
  webhooks: Webhook.array()
});

export type WebhookResponse = z.infer<typeof WebhookResponse>;

export const CreateWebhook = z.object({
  baseId: z.string(),
  specification: WebhookSpecification
});

export type CreateWebhook = z.infer<typeof CreateWebhook>;

export const WebhookCreated = z.object({
  id: z.string(),
  expirationTime: z.string()
});

export type WebhookCreated = z.infer<typeof WebhookCreated>;

export const DeleteWebhook = z.object({
  baseId: z.string(),
  webhookId: z.string()
});

export type DeleteWebhook = z.infer<typeof DeleteWebhook>;

export const UserInformation = z.object({
  id: z.string(),
  email: z.union([z.string(), z.null()])
});

export type UserInformation = z.infer<typeof UserInformation>;

export const models = {
  SuccessResponse: SuccessResponse,
  TableView: TableView,
  TableField: TableField,
  Table: Table,
  Base: Base,
  BaseId: BaseId,
  WebhookSpecification: WebhookSpecification,
  NotificationResult: NotificationResult,
  Webhook: Webhook,
  WebhookResponse: WebhookResponse,
  CreateWebhook: CreateWebhook,
  WebhookCreated: WebhookCreated,
  DeleteWebhook: DeleteWebhook,
  UserInformation: UserInformation
};