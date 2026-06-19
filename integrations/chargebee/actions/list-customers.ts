import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    company: z.string().optional(),
    phone: z.string().optional(),
    updated_at_gt: z.number().optional(),
    updated_at_lt: z.number().optional(),
    updated_at_gte: z.number().optional(),
    updated_at_lte: z.number().optional(),
    created_at_gt: z.number().optional(),
    created_at_lt: z.number().optional(),
    created_at_gte: z.number().optional(),
    created_at_lte: z.number().optional(),
    limit: z.number().max(100).optional(),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const CustomerSchema = z
    .object({
        id: z.string(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        email: z.string().optional(),
        company: z.string().optional(),
        phone: z.string().optional(),
        created_at: z.number().optional(),
        updated_at: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    customers: z.array(CustomerSchema),
    next_offset: z.string().optional()
});

const ResponseSchema = z
    .object({
        list: z.array(z.object({ customer: z.unknown() })),
        next_offset: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'List customers with optional filters.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/list-customers',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.first_name !== undefined) {
            params['first_name'] = input.first_name;
        }
        if (input.last_name !== undefined) {
            params['last_name'] = input.last_name;
        }
        if (input.email !== undefined) {
            params['email'] = input.email;
        }
        if (input.company !== undefined) {
            params['company'] = input.company;
        }
        if (input.phone !== undefined) {
            params['phone'] = input.phone;
        }
        if (input.updated_at_gt !== undefined) {
            params['updated_at[gt]'] = input.updated_at_gt;
        }
        if (input.updated_at_lt !== undefined) {
            params['updated_at[lt]'] = input.updated_at_lt;
        }
        if (input.updated_at_gte !== undefined) {
            params['updated_at[gte]'] = input.updated_at_gte;
        }
        if (input.updated_at_lte !== undefined) {
            params['updated_at[lte]'] = input.updated_at_lte;
        }
        if (input.created_at_gt !== undefined) {
            params['created_at[gt]'] = input.created_at_gt;
        }
        if (input.created_at_lt !== undefined) {
            params['created_at[lt]'] = input.created_at_lt;
        }
        if (input.created_at_gte !== undefined) {
            params['created_at[gte]'] = input.created_at_gte;
        }
        if (input.created_at_lte !== undefined) {
            params['created_at[lte]'] = input.created_at_lte;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.cursor !== undefined) {
            params['offset'] = input.cursor;
        }

        const config: ProxyConfiguration = {
            // https://apidocs.chargebee.com/docs/api/customers
            endpoint: '/api/v2/customers',
            params,
            retries: 3
        };

        const response = await nango.get(config);

        const data = ResponseSchema.parse(response.data);

        const customers = data.list.map((item) => {
            const customer = CustomerSchema.parse(item.customer);
            return customer;
        });

        return {
            customers,
            ...(data.next_offset !== undefined && { next_offset: data.next_offset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
