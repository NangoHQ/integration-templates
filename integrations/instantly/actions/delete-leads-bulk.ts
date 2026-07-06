import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        campaign_id: z.string().optional().describe('The ID of the campaign to delete leads from. Required if list_id is not provided.'),
        list_id: z.string().optional().describe('The ID of the list to delete leads from. Required if campaign_id is not provided.'),
        ids: z.array(z.string()).optional().describe('Optional array of specific lead IDs to delete.'),
        status: z.number().int().optional().describe('Optional status filter. Only delete leads with this status.'),
        limit: z.number().int().optional().describe('Maximum number of leads to delete.')
    })
    .refine((input) => input.campaign_id || input.list_id, {
        message: 'Either campaign_id or list_id must be provided.'
    })
    .refine((input) => (input.ids && input.ids.length > 0) || input.status !== undefined, {
        message: 'Either ids or status must be provided to avoid deleting all leads.'
    });

const OutputSchema = z.object({
    count: z.number().describe('Number of leads successfully deleted.')
});

const action = createAction({
    description: 'Delete leads in bulk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: { path: '/actions/delete-leads-bulk', method: 'POST' },
    scopes: ['leads:delete'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};

        if (input.campaign_id !== undefined) {
            body['campaign_id'] = input.campaign_id;
        }

        if (input.list_id !== undefined) {
            body['list_id'] = input.list_id;
        }

        if (input.status !== undefined) {
            body['status'] = input.status;
        }

        if (input.ids !== undefined && input.ids.length > 0) {
            body['ids'] = input.ids;
        }

        if (input.limit !== undefined) {
            body['limit'] = input.limit;
        }

        // https://developer.instantly.ai/api-reference/lead/delete-leads-in-bulk
        /* eslint-disable @nangohq/custom-integrations-linting/proxy-call-retries -- Bulk delete is non-idempotent; do not retry. */
        const response = await nango.delete({
            endpoint: '/v2/leads',
            data: body,
            retries: 0
        });
        /* eslint-enable @nangohq/custom-integrations-linting/proxy-call-retries */

        const ProviderResponseSchema = z.object({
            count: z.number()
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            count: providerResponse.count
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
