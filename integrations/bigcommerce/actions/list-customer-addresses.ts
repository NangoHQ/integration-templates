import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customer_id: z.string().describe('Customer ID. Example: "1"'),
    page: z.number().optional().describe('Page number. Example: 1'),
    limit: z.number().optional().describe('Items per page. Example: 50')
});

const AddressSchema = z.object({
    address1: z.string(),
    address2: z.string().optional(),
    address_type: z.enum(['residential', 'commercial']).optional(),
    city: z.string(),
    company: z.string().optional(),
    country: z.string().optional(),
    country_code: z.string(),
    customer_id: z.number(),
    first_name: z.string(),
    id: z.number(),
    last_name: z.string(),
    phone: z.string().optional(),
    postal_code: z.string(),
    state_or_province: z.string(),
    form_fields: z
        .array(
            z.object({
                name: z.string(),
                value: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
                address_id: z.number().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    items: z.array(AddressSchema),
    next_page: z.number().optional()
});

const action = createAction({
    description: 'List addresses for a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_customers_read_only'],
    endpoint: {
        path: '/actions/list-customer-addresses',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.bigcommerce.com/docs/rest-management/customers/customer-addresses#get-all-customer-addresses
        const response = await nango.get({
            endpoint: '/v3/customers/addresses',
            params: {
                'customer_id:in': input.customer_id,
                ...(input.page !== undefined && { page: String(input.page) }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const raw = response.data;
        if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from BigCommerce API.'
            });
        }

        const data: unknown[] = 'data' in raw && Array.isArray(raw.data) ? raw.data : [];
        const meta = 'meta' in raw && raw.meta !== null && typeof raw.meta === 'object' && !Array.isArray(raw.meta) ? raw.meta : {};
        const pagination =
            'pagination' in meta && meta.pagination !== null && typeof meta.pagination === 'object' && !Array.isArray(meta.pagination) ? meta.pagination : {};
        const currentPage = 'current_page' in pagination && typeof pagination.current_page === 'number' ? pagination.current_page : 1;
        const totalPages = 'total_pages' in pagination && typeof pagination.total_pages === 'number' ? pagination.total_pages : 1;
        const nextPage = currentPage < totalPages ? currentPage + 1 : undefined;

        const items: z.infer<typeof AddressSchema>[] = [];
        for (const item of data) {
            if (item === null || typeof item !== 'object' || Array.isArray(item)) {
                continue;
            }
            const parsed = AddressSchema.safeParse(item);
            if (parsed.success) {
                items.push(parsed.data);
            }
        }

        return {
            items,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
