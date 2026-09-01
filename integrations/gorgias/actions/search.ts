import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        type: z
            .enum([
                'agent',
                'customer',
                'customer_profile',
                'customer_channel',
                'customer_channel_email',
                'customer_channel_phone',
                'customers_by_phone',
                'integration',
                'team',
                'tag'
            ])
            .describe('The resource type to search across. Supported values include agent, customer, tag, team, and integration.'),
        query: z.string().describe('The text query to search for.')
    })
    .describe('Input for the search action.');

const OutputSchema = z
    .object({
        data: z.array(z.object({}).passthrough()).describe('Search results matching the query and type. Each item shape depends on the searched type.'),
        meta: z.object({}).passthrough().optional().describe('Response metadata, including pagination cursors if applicable.')
    })
    .describe('Output of the search action.');

/**
 * @tags: [read]
 * @tagReason: Searches provider data using the public search API.
 */
const action = createAction({
    description: 'Search across agents, customers, customer channels/profiles, integrations, teams, or tags by a text query.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.gorgias.com/reference/search
            endpoint: '/api/search',
            data: {
                type: input.type,
                query: input.query
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                data: z.array(z.object({}).passthrough()),
                meta: z.object({}).passthrough().optional()
            })
            .parse(response.data);

        return {
            data: providerResponse.data,
            ...(providerResponse.meta !== undefined && { meta: providerResponse.meta })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
