import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        scheduleId: z.number().describe('The unique identifier of the availability schedule to delete. Example: 2261454')
    })
    .describe('Input parameters for deleting an availability schedule.');

const ProviderResponseSchema = z.object({
    status: z.enum(['success', 'error'])
});

const OutputSchema = z
    .object({
        status: z.enum(['success', 'error']).describe('The outcome of the delete operation.')
    })
    .describe('Output returned after deleting an availability schedule.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes an availability schedule from the provider.
 * @pitfalls: Attempting to delete a non-existent schedule returns a 400 Bad Request error rather than a 404.
 */
const action = createAction({
    description: 'Delete or archive an availability schedule in Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['SCHEDULE_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://cal.com/docs/api-reference/v2/schedules/delete-a-schedule
            endpoint: `/schedules/${encodeURIComponent(input.scheduleId)}`,
            headers: {
                'cal-api-version': '2024-06-11'
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            status: providerResponse.status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
