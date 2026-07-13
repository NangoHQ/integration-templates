import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (next_page_token) from the previous response. Omit for the first page.')
});

const DisputeAmountSchema = z.object({
    currency_code: z.string().optional(),
    value: z.string().optional()
});

const DisputeItemSchema = z.object({
    dispute_id: z.string(),
    reason: z.string().optional(),
    status: z.string().optional(),
    dispute_state: z.string().optional(),
    dispute_life_cycle_stage: z.string().optional(),
    dispute_channel: z.string().optional(),
    dispute_amount: DisputeAmountSchema.optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional()
});

const LinkSchema = z.object({
    href: z.string(),
    rel: z.string(),
    method: z.string().optional(),
    encType: z.string().optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(DisputeItemSchema).optional(),
    links: z.array(LinkSchema).optional()
});

const OutputSchema = z.object({
    items: z.array(DisputeItemSchema),
    next_page_token: z.string().optional()
});

const action = createAction({
    description: 'List disputes.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://uri.paypal.com/services/disputes/read-seller'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.paypal.com/api/customer-disputes/v1/#disputes_list
        const response = await nango.get({
            endpoint: '/v1/customer/disputes',
            params: {
                ...(input.cursor !== undefined && { next_page_token: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const items = providerResponse.items ?? [];

        let nextPageToken: string | undefined;
        if (providerResponse.links) {
            const nextLink = providerResponse.links.find((link) => link.rel === 'next');
            if (nextLink) {
                const url = new URL(nextLink.href);
                const token = url.searchParams.get('next_page_token');
                if (token) {
                    nextPageToken = token;
                }
            }
        }

        return {
            items,
            ...(nextPageToken !== undefined && { next_page_token: nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
