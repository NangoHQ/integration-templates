import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the webhook. Example: "Employee Updates"'),
    monitorFields: z
        .array(z.string())
        .optional()
        .describe('A list of fields to monitor. Required when events includes employee.updated or employee_with_fields.updated, or when events is omitted.'),
    postFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('An object map of field ID or alias to the external name used in the webhook payload. Example: {"firstName": "First Name"}'),
    url: z.string().describe('The URL the webhook should send data to. Must begin with https://. Example: "https://example.com/webhook"'),
    format: z.enum(['json', 'form-encoded']).describe('The payload format the webhook uses.'),
    includeCompanyDomain: z.boolean().optional().describe('If set to true, the company domain will be added to the webhook request header.'),
    events: z.array(z.string()).optional().describe('Events that trigger this webhook. Defaults to employee_with_fields events if not specified.')
});

const ProviderWebhookSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        created: z.string().optional(),
        lastSent: z.string().nullable().optional(),
        monitorFields: z.array(z.string()).optional(),
        postFields: z.record(z.string(), z.string()).optional(),
        url: z.string(),
        format: z.string(),
        privateKey: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    created: z.string().optional(),
    lastSent: z.string().optional(),
    monitorFields: z.array(z.string()).optional(),
    postFields: z.record(z.string(), z.string()).optional(),
    url: z.string(),
    format: z.string(),
    privateKey: z.string().optional()
});

const action = createAction({
    description: 'Create a webhook subscription in BambooHR.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-webhook',
        group: 'Webhooks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://documentation.bamboohr.com/reference/create-webhook
            endpoint: 'v1/webhooks',
            data: {
                name: input.name,
                ...(input.monitorFields !== undefined && { monitorFields: input.monitorFields }),
                ...(input.postFields !== undefined && { postFields: input.postFields }),
                url: input.url,
                format: input.format,
                ...(input.includeCompanyDomain !== undefined && { includeCompanyDomain: input.includeCompanyDomain }),
                ...(input.events !== undefined && { events: input.events })
            },
            retries: 3
        });

        const providerWebhook = ProviderWebhookSchema.parse(response.data);

        return {
            id: providerWebhook.id,
            name: providerWebhook.name,
            ...(providerWebhook.created !== undefined && { created: providerWebhook.created }),
            ...(providerWebhook.lastSent != null && { lastSent: providerWebhook.lastSent }),
            ...(providerWebhook.monitorFields !== undefined && { monitorFields: providerWebhook.monitorFields }),
            ...(providerWebhook.postFields !== undefined && { postFields: providerWebhook.postFields }),
            url: providerWebhook.url,
            format: providerWebhook.format,
            ...(providerWebhook.privateKey !== undefined && { privateKey: providerWebhook.privateKey })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
