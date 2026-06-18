import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Page number from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(250).optional().describe('Number of results per page. Default is 50, maximum is 250.'),
    date_modified_min: z.string().optional().describe('ISO8601 timestamp. Only return customers modified after this date. Example: "2026-01-01T00:00:00Z".')
});

const CustomerSchema = z
    .object({
        id: z.number().describe('Customer ID. Example: 1'),
        first_name: z.string().nullable().optional(),
        last_name: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        company: z.string().nullable().optional(),
        date_created: z.string().nullable().optional(),
        date_modified: z.string().nullable().optional(),
        address_count: z.number().nullable().optional(),
        customer_group_id: z.number().nullable().optional(),
        notes: z.string().nullable().optional(),
        tax_exempt_category: z.string().nullable().optional(),
        accepts_product_review_abandoned_cart_emails: z.boolean().nullable().optional(),
        store_credit: z
            .object({
                amount: z.number().nullable().optional(),
                currency: z.string().nullable().optional()
            })
            .nullable()
            .optional(),
        channel_ids: z.array(z.number()).nullable().optional(),
        origin_channel_id: z.number().nullable().optional(),
        attributes: z
            .array(
                z
                    .object({
                        id: z.number().nullable().optional(),
                        name: z.string().nullable().optional(),
                        value: z.unknown().optional()
                    })
                    .nullable()
            )
            .nullable()
            .optional()
    })
    .passthrough();

const ListOutputSchema = z.object({
    items: z.array(CustomerSchema),
    next_cursor: z.string().optional().describe('Page number for the next page. Omit when there are no more pages.')
});

const PaginationMetaSchema = z.object({
    pagination: z.object({
        total: z.number(),
        count: z.number(),
        per_page: z.number(),
        current_page: z.number(),
        total_pages: z.number(),
        links: z.object({
            next: z.string().optional(),
            current: z.string().optional(),
            previous: z.string().optional()
        })
    })
});

const action = createAction({
    description: 'List customers.',
    version: '1.0.0',
    endpoint: {
        path: '/actions/list-customers',
        method: 'GET'
    },
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['store_v2_customers_read_only'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer page number'
            });
        }

        const limit = input.limit ?? 50;

        const params: Record<string, string | number> = {
            page: page,
            limit: limit
        };

        if (input.date_modified_min) {
            params['date_modified:min'] = input.date_modified_min;
        }

        // https://developer.bigcommerce.com/docs/rest-management/customers
        const response = await nango.get({
            endpoint: '/v3/customers',
            params: params,
            retries: 3
        });

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from BigCommerce API'
            });
        }

        const dataArray: unknown[] = Array.isArray(rawData['data']) ? rawData['data'] : [];
        const meta = PaginationMetaSchema.safeParse(rawData['meta']);
        const parsedMeta = meta.success ? meta.data : undefined;

        const customers: Array<z.infer<typeof CustomerSchema>> = [];
        for (const item of dataArray) {
            const parsed = CustomerSchema.safeParse(item);
            if (parsed.success) {
                customers.push(parsed.data);
            }
        }

        let nextCursor: string | undefined;
        if (parsedMeta && parsedMeta.pagination.links.next) {
            const nextUrl = parsedMeta.pagination.links.next;
            const match = nextUrl.match(/[?&]page=(\d+)/);
            if (match) {
                nextCursor = match[1];
            }
        }

        return {
            items: customers,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
