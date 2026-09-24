import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the service to delete. Example: "PHTFMNA"')
    })
    .describe('Input for deleting a PagerDuty service by ID.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a service and its associated integrations from the provider.
 * @pitfalls: The deletion is permanent and irreversible; all integrations belonging to the service are destroyed along with it, immediately breaking any external event sources using those integration keys.
 */
const action = createAction({
    description: 'Delete a service.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Null response indicating successful deletion.'),
    scopes: ['services.write'],

    exec: async (nango, input): Promise<null> => {
        const config: ProxyConfiguration = {
            // https://developer.pagerduty.com/api-reference
            endpoint: `/services/${encodeURIComponent(input.id)}`,
            retries: 3
        };

        await nango.delete(config);
        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
