import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination bookmark from the previous response. Omit for the first page.')
});

const ProviderWebsiteSchema = z.object({
    status: z.string().optional(),
    verified_at: z.string().optional(),
    website: z.string()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            website: z.string(),
            status: z.string().optional(),
            verified_at: z.string().optional()
        })
    ),
    next_bookmark: z.string().optional()
});

const action = createAction({
    description: 'List claimed/verified websites for the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_accounts:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pinterest.com/docs/api/v5/#operation/user_websites/get
        const response = await nango.get({
            endpoint: '/v5/user_account/websites',
            params: {
                ...(input.cursor !== undefined && { bookmark: input.cursor })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                items: z.array(ProviderWebsiteSchema),
                bookmark: z.string().nullable().optional()
            })
            .parse(response.data);

        return {
            items: providerResponse.items.map((item) => ({
                website: item.website,
                ...(item.status !== undefined && { status: item.status }),
                ...(item.verified_at !== undefined && { verified_at: item.verified_at })
            })),
            ...(providerResponse.bookmark != null && { next_bookmark: providerResponse.bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
