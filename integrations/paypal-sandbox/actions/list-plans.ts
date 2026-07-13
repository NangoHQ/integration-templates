import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    page_size: z.number().int().min(1).max(20).optional().describe('Number of items to return per page. Max: 20.'),
    product_id: z.string().optional().describe('Filter by Product ID.')
});

const PlanSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    description: z.string().optional(),
    usage_type: z.string().optional(),
    create_time: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(PlanSchema),
    next_page: z.string().optional()
});

const action = createAction({
    description: 'List billing plans.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://uri.paypal.com/services/subscriptions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer page number'
            });
        }

        const pageSize = input.page_size ?? 10;

        // https://developer.paypal.com/docs/api/subscriptions/v1/#plans_list
        const response = await nango.get({
            endpoint: '/v1/billing/plans',
            params: {
                ...(input.product_id !== undefined && { product_id: input.product_id }),
                page_size: pageSize,
                page: page,
                total_required: 'true'
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                plans: z.array(z.unknown()).optional(),
                total_items: z.number().optional(),
                total_pages: z.number().optional()
            })
            .parse(response.data);

        const items = (providerResponse.plans ?? []).map((item) => {
            const plan = z
                .object({
                    id: z.string(),
                    name: z.string().optional(),
                    status: z.string().optional(),
                    description: z.string().optional(),
                    usage_type: z.string().optional(),
                    create_time: z.string().optional()
                })
                .parse(item);
            return plan;
        });

        const nextPage =
            providerResponse.total_items !== undefined && providerResponse.total_pages !== undefined && page < providerResponse.total_pages
                ? String(page + 1)
                : undefined;

        return {
            items,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
