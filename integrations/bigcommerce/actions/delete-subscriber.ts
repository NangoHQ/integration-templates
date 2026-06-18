import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    subscriber_id: z.number().describe('The ID of the subscriber to delete. Example: 1')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete an email subscriber.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/delete-subscriber',
        method: 'POST'
    },
    scopes: ['store_v2_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.bigcommerce.com/docs/rest-management/customers/subscribers#delete-a-subscriber
            endpoint: `/v3/customers/subscribers/${encodeURIComponent(input.subscriber_id)}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Subscriber with id ${input.subscriber_id} not found.`
            });
        }

        if (response.status >= 400) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Failed to delete subscriber. Status: ${response.status}`,
                status: response.status
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
