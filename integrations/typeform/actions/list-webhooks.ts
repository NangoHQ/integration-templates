import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    form_id: z.string().describe('Unique ID for the form. Example: "WMpBq4vc"')
});

const EventTypesSchema = z.record(z.string(), z.boolean());

const WebhookSchema = z.object({
    created_at: z.string(),
    enabled: z.boolean(),
    event_types: EventTypesSchema,
    form_id: z.string(),
    id: z.string(),
    secret: z.string().optional(),
    tag: z.string(),
    updated_at: z.string(),
    url: z.string(),
    verify_ssl: z.boolean()
});

const OutputSchema = z.object({
    items: z.array(WebhookSchema)
});

const action = createAction({
    description: 'List webhooks',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhooks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.typeform.com/developers/webhooks/reference/retrieve-webhooks/
            endpoint: `/forms/${encodeURIComponent(input.form_id)}/webhooks`,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
