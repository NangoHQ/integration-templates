import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    base_id: z.string().describe('The ID of the Airtable base containing the webhook. Example: "appXXXXXXXXXXXXXX"'),
    webhook_id: z.string().describe('The ID of the webhook to delete. Example: "achXXXXXXXXXXXXXX"')
});

const ProviderResponseSchema = z.object({
    success: z.boolean().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    base_id: z.string(),
    webhook_id: z.string()
});

const action = createAction({
    description: 'Delete an Airtable webhook from a base.',
    version: '2.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-webhook',
        group: 'Webhooks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhook:manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://airtable.com/developers/web/api/delete-a-webhook
            endpoint: `/v0/bases/${input.base_id}/webhooks/${input.webhook_id}`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            success: parsed.success ?? true,
            base_id: input.base_id,
            webhook_id: input.webhook_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
