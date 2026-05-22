import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    per_page: z.number().optional().describe('Number of items per page. Default: 10.'),
    search: z.string().optional().describe('Search by customer name or email.'),
    role: z.string().optional().describe('Filter by customer role (customer, subscriber, etc.).'),
    orderby: z.string().optional().describe('Sort by field (id, name, registered_date, etc.).'),
    order: z.enum(['asc', 'desc']).optional().describe('Sort order.'),
    email: z.string().optional().describe('Filter by email address.')
});

const ProviderCustomerSchema = z.object({
    id: z.number(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    date_modified: z.string().optional(),
    date_modified_gmt: z.string().optional(),
    email: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    role: z.string(),
    username: z.string(),
    billing: z
        .object({
            first_name: z.string().optional(),
            last_name: z.string().optional(),
            company: z.string().optional(),
            address_1: z.string().optional(),
            address_2: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            postcode: z.string().optional(),
            country: z.string().optional(),
            email: z.string().optional(),
            phone: z.string().optional()
        })
        .passthrough()
        .optional(),
    shipping: z
        .object({
            first_name: z.string().optional(),
            last_name: z.string().optional(),
            company: z.string().optional(),
            address_1: z.string().optional(),
            address_2: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            postcode: z.string().optional(),
            country: z.string().optional()
        })
        .passthrough()
        .optional(),
    is_paying_customer: z.boolean().optional(),
    avatar_url: z.string().optional(),
    meta_data: z
        .array(
            z.object({
                id: z.number().optional(),
                key: z.string(),
                value: z.unknown()
            })
        )
        .optional()
});

const OutputCustomerSchema = z.object({
    id: z.number(),
    email: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    role: z.string(),
    username: z.string(),
    billing: z.record(z.string(), z.unknown()).optional(),
    shipping: z.record(z.string(), z.unknown()).optional(),
    is_paying_customer: z.boolean().optional(),
    avatar_url: z.string().optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional()
});

const OutputSchema = z.object({
    customers: z.array(OutputCustomerSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List customers from WooCommerce.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-customers',
        group: 'Customers'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer string representing a page number.'
            });
        }
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer string representing a page number.'
            });
        }

        const params: Record<string, string> = {
            page: String(page)
        };

        if (input.per_page !== undefined) {
            params['per_page'] = String(input.per_page);
        }
        if (input.search !== undefined) {
            params['search'] = input.search;
        }
        if (input.role !== undefined) {
            params['role'] = input.role;
        }
        if (input.orderby !== undefined) {
            params['orderby'] = input.orderby;
        }
        if (input.order !== undefined) {
            params['order'] = input.order;
        }
        if (input.email !== undefined) {
            params['email'] = input.email;
        }

        // https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-customers
        const response = await nango.get({
            endpoint: '/wp-json/wc/v3/customers',
            params,
            retries: 3
        });

        const customers = z.array(ProviderCustomerSchema).parse(response.data);

        const mappedCustomers = customers.map((customer) => ({
            id: customer.id,
            email: customer.email,
            first_name: customer.first_name,
            last_name: customer.last_name,
            role: customer.role,
            username: customer.username,
            ...(customer.billing !== undefined && { billing: customer.billing }),
            ...(customer.shipping !== undefined && { shipping: customer.shipping }),
            ...(customer.is_paying_customer !== undefined && {
                is_paying_customer: customer.is_paying_customer
            }),
            ...(customer.avatar_url !== undefined && { avatar_url: customer.avatar_url }),
            ...(customer.date_created !== undefined && { date_created: customer.date_created }),
            ...(customer.date_modified !== undefined && { date_modified: customer.date_modified })
        }));

        const nextCursor = customers.length > 0 ? String(page + 1) : undefined;

        return {
            customers: mappedCustomers,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
