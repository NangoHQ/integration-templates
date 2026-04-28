import { z } from 'zod';
import { createAction } from 'nango';

const WebhookFiltersSchema = z.object({
    dataTypes: z.array(z.string()).describe('The types of data changes to watch. Example: ["tableData"]'),
    recordChangeScope: z.string().optional().describe('The table ID to scope changes to. Example: "tblXXXXXXXXXXXXXX"'),
    changeTypes: z.array(z.string()).optional().describe('The types of changes to watch. Example: ["add", "update", "remove"]'),
    fromSources: z.array(z.string()).optional().describe('The sources of changes to watch. Example: ["client", "formSubmission"]'),
    watchDataInFieldIds: z.array(z.string()).optional().describe('Field IDs to watch for data changes. Example: ["fldXXXXXXXXXXXXXX"]'),
    watchSchemaInFieldIds: z.array(z.string()).optional().describe('Field IDs to watch for schema changes. Example: ["fldXXXXXXXXXXXXXX"]')
});

const WebhookIncludesSchema = z.object({
    includeCellValuesInFieldIds: z
        .union([z.array(z.string()), z.literal('all')])
        .optional()
        .describe('Field IDs to include cell values for, or "all".'),
    includePreviousCellValues: z.boolean().optional().describe('Whether to include previous cell values.'),
    includePreviousFieldDefinitions: z.boolean().optional().describe('Whether to include previous field definitions.')
});

const WebhookOptionsSchema = z.object({
    filters: WebhookFiltersSchema,
    includes: WebhookIncludesSchema.optional()
});

const WebhookSpecificationSchema = z.object({
    options: WebhookOptionsSchema
});

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the base to create the webhook on. Example: "appXXXXXXXXXXXXXX"'),
    notificationUrl: z.string().describe('The URL where Airtable will POST all event notifications. Example: "https://example.com/webhook"'),
    specification: WebhookSpecificationSchema.describe('The webhook specification defining what changes to watch.')
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    macSecretBase64: z.string(),
    expirationTime: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the created webhook. Example: "achXXXXXXXXXXXXXX"'),
    macSecretBase64: z.string().describe('The base64-encoded MAC secret for validating webhook notifications.'),
    expirationTime: z.string().optional().describe('The timestamp when the webhook will expire and be deleted.')
});

const action = createAction({
    description: 'Create an Airtable webhook on a base.',
    version: '2.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-webhook',
        group: 'Webhooks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhook:manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://airtable.com/developers/web/api/create-a-webhook
            endpoint: `/v0/bases/${input.baseId}/webhooks`,
            data: {
                notificationUrl: input.notificationUrl,
                specification: input.specification
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id,
            macSecretBase64: providerResponse.macSecretBase64,
            ...(providerResponse.expirationTime !== undefined && { expirationTime: providerResponse.expirationTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
