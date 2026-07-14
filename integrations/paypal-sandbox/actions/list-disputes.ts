import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    page_size: z.number().int().min(1).max(50).optional().describe('Number of disputes to return per page. Maximum 50. Default 10.')
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
    next_page: z.number().optional()
});

const action = createAction({
    description: 'List disputes.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://uri.paypal.com/services/disputes/read-seller'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^[1-9]\d*$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer page number.'
            });
        }
        const page = input.cursor !== undefined ? Number(input.cursor) : 1;
        if (page > 50) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: "cursor must not exceed PayPal's maximum page number of 50."
            });
        }

        // https://developer.paypal.com/api/customer-disputes/v1/#disputes_list
        // Uses page/page_size (the current pagination contract) rather than the deprecated next_page_token.
        const response = await nango.get({
            endpoint: '/v1/customer/disputes',
            params: {
                page,
                page_size: input.page_size ?? 10
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const items = providerResponse.items ?? [];

        const hasNext = providerResponse.links?.some((link) => link.rel === 'next') ?? false;

        return {
            items,
            ...(hasNext && { next_page: page + 1 })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
