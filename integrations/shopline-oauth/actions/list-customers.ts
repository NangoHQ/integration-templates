import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        since_id: z.string().optional().describe('Return customers with IDs greater than this value.'),
        updated_at_min: z.string().optional().describe('Minimum updated_at timestamp (ISO 8601) to filter customers.'),
        updated_at_max: z.string().optional().describe('Maximum updated_at timestamp (ISO 8601) to filter customers.'),
        created_at_min: z.string().optional().describe('Minimum created_at timestamp (ISO 8601) to filter customers.'),
        created_at_max: z.string().optional().describe('Maximum created_at timestamp (ISO 8601) to filter customers.'),
        ids: z.string().optional().describe('Comma-separated list of customer IDs to retrieve.'),
        fields: z.string().optional().describe('Comma-separated list of fields to include in the response.'),
        limit: z.number().int().min(1).max(250).optional().describe('Number of results per page (1-250, default 50).')
    })
    .describe('Input parameters for listing customers with filtering and pagination.');

const AddressSchema = z
    .object({
        id: z.string().nullish().describe('Unique address identifier.'),
        customer_id: z.string().nullish().describe('ID of the customer this address belongs to.'),
        first_name: z.string().nullish().describe('First name for the address.'),
        last_name: z.string().nullish().describe('Last name for the address.'),
        company: z.string().nullish().describe('Company name for the address.'),
        address1: z.string().nullish().describe('First line of the street address.'),
        address2: z.string().nullish().describe('Second line of the street address.'),
        city: z.string().nullish().describe('City name.'),
        province: z.string().nullish().describe('Province or state name.'),
        country: z.string().nullish().describe('Country name.'),
        zip: z.string().nullish().describe('Postal or ZIP code.'),
        phone: z.string().nullish().describe('Phone number associated with the address.'),
        default: z.boolean().nullish().describe('Whether this is the default address for the customer.')
    })
    .passthrough();

const CustomerSchema = z
    .object({
        id: z.string().describe('Unique customer identifier.'),
        email: z.string().nullish().describe('Customer email address.'),
        first_name: z.string().nullish().describe('Customer first name.'),
        last_name: z.string().nullish().describe('Customer last name.'),
        phone: z.string().nullish().describe('Customer phone number.'),
        created_at: z.string().nullish().describe('ISO 8601 timestamp when the customer was created.'),
        updated_at: z.string().nullish().describe('ISO 8601 timestamp when the customer was last updated.'),
        state: z.number().nullish().describe('Customer state indicator.'),
        orders_count: z.number().nullish().describe('Total number of orders placed by this customer.'),
        total_spent: z.string().nullish().describe('Total amount spent by this customer.'),
        addresses: z.array(AddressSchema).nullish().describe('List of customer addresses.'),
        default_address: AddressSchema.nullish().describe('Default shipping address for the customer.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        customers: z.array(CustomerSchema).describe('Array of customer objects matching the query.'),
        next_cursor: z.string().optional().describe('Pagination cursor to fetch the next page. Absent when there are no more results.')
    })
    .describe('Output of the list customers action.');

const ProviderResponseSchema = z.object({
    customers: z.array(z.unknown())
});

/**
 * @tags: [read]
 * @tagReason: This action only reads customer data from the provider.
 * @pitfalls: Customer state is numeric (e.g. 1) not a string, total_spent is returned as a string-formatted decimal, and last_order_id/last_order_name may be the literal "N/A" instead of null when absent.
 */
const action = createAction({
    description: 'List customers with filtering and pagination.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.cursor !== undefined) {
            params['page_info'] = input.cursor;
        }
        if (input.since_id !== undefined) {
            params['since_id'] = input.since_id;
        }
        if (input.updated_at_min !== undefined) {
            params['updated_at_min'] = input.updated_at_min;
        }
        if (input.updated_at_max !== undefined) {
            params['updated_at_max'] = input.updated_at_max;
        }
        if (input.created_at_min !== undefined) {
            params['created_at_min'] = input.created_at_min;
        }
        if (input.created_at_max !== undefined) {
            params['created_at_max'] = input.created_at_max;
        }
        if (input.ids !== undefined) {
            params['ids'] = input.ids;
        }
        if (input.fields !== undefined) {
            params['fields'] = input.fields;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }

        const response = await nango.get({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/customer/customer-v2/list-customer
            endpoint: '/admin/openapi/v20260601/v2/customers.json',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const rawLink = response.headers['link'] || response.headers['Link'];
        let linkHeader: string | undefined;
        if (typeof rawLink === 'string') {
            linkHeader = rawLink;
        } else if (Array.isArray(rawLink)) {
            linkHeader = rawLink.join(', ');
        }
        const nextCursor = extractNextCursor(linkHeader);

        const customers = providerResponse.customers.map((customer) => {
            const parsed = CustomerSchema.safeParse(customer);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Invalid customer object in provider response.'
                });
            }
            return parsed.data;
        });

        return {
            customers,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

function extractNextCursor(linkHeader: string | undefined): string | undefined {
    if (!linkHeader || typeof linkHeader !== 'string') {
        return undefined;
    }
    const match = linkHeader.match(/<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="next"/);
    if (match && match[1]) {
        return decodeURIComponent(match[1]);
    }
    return undefined;
}

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
