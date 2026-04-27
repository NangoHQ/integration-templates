import { z } from 'zod';
import { createAction } from 'nango';

const FilterOptionsSchema = z.object({
    dataTypes: z
        .array(z.enum(['tableData', 'tableFields', 'tableMetadata']))
        .optional()
        .describe('Data types to monitor. Example: ["tableData"]'),
    recordChangeScope: z.string().optional().describe('Table ID to limit monitoring to specific table. Example: "tblXXXXXXXXXXXXXX"'),
    changeTypes: z
        .array(z.enum(['add', 'update', 'remove']))
        .optional()
        .describe('Types of changes to monitor. Example: ["add", "update"]'),
    watchDataInFieldIds: z.array(z.string()).optional().describe('Field IDs to watch for data changes. Example: ["fldXXXXXXXXXXXXXX"]'),
    watchSchemasOfFieldIds: z.array(z.string()).optional().describe('Field IDs to watch for schema changes. Example: ["fldXXXXXXXXXXXXXX"]')
});

const SpecificationOptionsSchema = z.object({
    filters: FilterOptionsSchema.optional()
});

const SpecificationSchema = z.object({
    options: SpecificationOptionsSchema.optional()
});

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the base to create the webhook on. Example: "appXXXXXXXXXXXXXX"'),
    notificationUrl: z.string().describe('The URL that will receive webhook notifications. Example: "https://example.com/webhook"'),
    specification: SpecificationSchema.optional().describe('Webhook specification defining what changes to monitor')
});

// Provider response schema based on Airtable API
// https://airtable.com/developers/web/api/create-a-webhook
const ProviderResponseSchema = z.object({
    id: z.string(),
    macSecretBase64: z.string(),
    expirationTime: z.string()
});

const OutputSchema = z.object({
    webhookId: z.string().describe('The ID of the created webhook'),
    baseId: z.string().describe('The ID of the base'),
    macSecretBase64: z.string().describe('Base64-encoded MAC secret for verifying webhook payloads'),
    expirationTime: z.string().describe('When the webhook expires')
});

const action = createAction({
    description: 'Create an Airtable webhook on a base',
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
        const requestBody: {
            notificationUrl: string;
            specification?: z.infer<typeof SpecificationSchema>;
        } = {
            notificationUrl: input.notificationUrl
        };

        if (input.specification !== undefined) {
            requestBody.specification = input.specification;
        }

        // https://airtable.com/developers/web/api/create-a-webhook
        const response = await nango.post({
            endpoint: `/v0/bases/${input.baseId}/webhooks`,
            data: requestBody,
            retries: 10
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            webhookId: providerData.id,
            baseId: input.baseId,
            macSecretBase64: providerData.macSecretBase64,
            expirationTime: providerData.expirationTime
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
