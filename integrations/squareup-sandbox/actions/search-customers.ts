import { z } from 'zod';
import { createAction } from 'nango';

const CustomerAddressSchema = z.object({
    address_line_1: z.string().nullable().optional(),
    address_line_2: z.string().nullable().optional(),
    address_line_3: z.string().nullable().optional(),
    locality: z.string().nullable().optional(),
    sublocality: z.string().nullable().optional(),
    sublocality_2: z.string().nullable().optional(),
    sublocality_3: z.string().nullable().optional(),
    administrative_district_level_1: z.string().nullable().optional(),
    administrative_district_level_2: z.string().nullable().optional(),
    administrative_district_level_3: z.string().nullable().optional(),
    postal_code: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional()
});

const CustomerPreferencesSchema = z.object({
    email_unsubscribed: z.boolean().nullable().optional()
});

const CustomerSchema = z.object({
    id: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    given_name: z.string().nullable().optional(),
    family_name: z.string().nullable().optional(),
    company_name: z.string().nullable().optional(),
    email_address: z.string().nullable().optional(),
    phone_number: z.string().nullable().optional(),
    address: CustomerAddressSchema.nullable().optional(),
    preferences: CustomerPreferencesSchema.nullable().optional(),
    creation_source: z.string().nullable().optional(),
    group_ids: z.array(z.string()).nullable().optional(),
    segment_ids: z.array(z.string()).nullable().optional(),
    version: z.number().nullable().optional()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from a previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Maximum number of results to return in a single page. Default is 100.'),
    email_address: z.string().optional().describe('Email address to search for (fuzzy match).'),
    phone_number: z.string().optional().describe('Phone number to search for (fuzzy match).'),
    reference_id: z.string().optional().describe('Reference ID to search for (fuzzy match).'),
    sort_field: z.enum(['CREATED_AT', 'DEFAULT']).optional().describe('Field to sort by.'),
    sort_order: z.enum(['ASC', 'DESC']).optional().describe('Sort order.')
});

const OutputSchema = z.object({
    customers: z.array(CustomerSchema),
    next_cursor: z.string().optional().describe('Pagination cursor to retrieve the next page of results.'),
    count: z.number().optional().describe('Total count of matching customers when count is requested.')
});

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const action = createAction({
    description: 'Search customers by filters (email, phone, name, etc).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['CUSTOMERS_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query: {
            filter?: Record<string, unknown>;
            sort?: Record<string, string>;
        } = {};

        const filter: Record<string, unknown> = {};

        if (input.email_address !== undefined) {
            filter['email_address'] = { fuzzy: input.email_address };
        }

        if (input.phone_number !== undefined) {
            filter['phone_number'] = { fuzzy: input.phone_number };
        }

        if (input.reference_id !== undefined) {
            filter['reference_id'] = { fuzzy: input.reference_id };
        }

        if (Object.keys(filter).length > 0) {
            query.filter = filter;
        }

        if (input.sort_field !== undefined || input.sort_order !== undefined) {
            const sort: Record<string, string> = {};
            if (input.sort_field !== undefined) {
                sort['field'] = input.sort_field;
            }
            if (input.sort_order !== undefined) {
                sort['order'] = input.sort_order;
            }
            query.sort = sort;
        }

        const requestBody: Record<string, unknown> = {};

        if (input.cursor !== undefined) {
            requestBody['cursor'] = input.cursor;
        }

        if (input.limit !== undefined) {
            requestBody['limit'] = input.limit;
        }

        if (Object.keys(query).length > 0) {
            requestBody['query'] = query;
        }

        // https://developer.squareup.com/reference/square/customers-api/search-customers
        const response = await nango.post({
            endpoint: '/v2/customers/search',
            data: requestBody,
            retries: 3
        });

        const raw = response.data;

        if (!isObject(raw)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Square API'
            });
        }

        const rawCustomers = raw['customers'];
        const rawCursor = raw['cursor'];
        const rawCount = raw['count'];

        const customers: z.infer<typeof CustomerSchema>[] = [];

        if (Array.isArray(rawCustomers)) {
            for (const item of rawCustomers) {
                const parsed = CustomerSchema.safeParse(item);
                if (!parsed.success) {
                    throw new nango.ActionError({
                        type: 'invalid_customer',
                        message: 'Failed to parse a customer from the Square API response.'
                    });
                }
                customers.push(parsed.data);
            }
        }

        const output: z.infer<typeof OutputSchema> = {
            customers
        };

        if (typeof rawCursor === 'string') {
            output.next_cursor = rawCursor;
        }

        if (typeof rawCount === 'number') {
            output.count = rawCount;
        }

        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
