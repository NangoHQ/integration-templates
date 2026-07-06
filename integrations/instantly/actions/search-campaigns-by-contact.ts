import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().describe('Lead email address to search for. Example: "lead@example.com"')
});

const CampaignSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        status: z.number(),
        timestamp_created: z.string(),
        timestamp_updated: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(CampaignSchema)
});

const action = createAction({
    description: 'Search campaigns by lead email',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaigns:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.instantly.ai/api-reference/campaign/search-campaigns-by-lead-email
        const response = await nango.get({
            endpoint: '/v2/campaigns/search-by-contact',
            params: {
                search: input.email
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            items: z.array(z.unknown())
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.items.map((item) => CampaignSchema.parse(item))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
