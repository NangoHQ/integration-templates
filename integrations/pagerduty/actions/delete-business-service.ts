import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the business service to delete.')
    })
    .describe('Input parameters for deleting a PagerDuty business service.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a business service from PagerDuty.
 */
const action = createAction({
    description: 'Delete a business service.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Null response confirming the business service was deleted successfully.'),
    scopes: ['services.write'],
    exec: async (nango, input): Promise<null> => {
        await nango.delete({
            // https://developer.pagerduty.com/api-reference/
            endpoint: `/business_services/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
