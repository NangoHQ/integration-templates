import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        query: z
            .string()
            .optional()
            .describe(
                'Structured search query for fields such as customer_id, orders_count, email_subscribe_flag, state, total_spent, updated_at, and verified_email.'
            ),
        query_param: z
            .string()
            .max(50)
            .optional()
            .describe('Fuzzy search string across phone, email, first_name, last_name, address1, and address2. Maximum 50 characters.'),
        limit: z.number().int().min(1).max(250).optional().describe('Maximum number of results to return per page.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response (page_info). Omit for the first page.'),
        order: z.string().optional().describe('Sort order, e.g. "uid:asc" or "updated_at:desc".'),
        fields: z.string().optional().describe('Comma-separated list of fields to include in the response.')
    })
    .describe('Input for searching customers.');

const AddressSchema = z.object({
    id: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Unique identifier for the address.'),
    customer_id: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('ID of the customer this address belongs to.'),
    first_name: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('First name associated with the address.'),
    last_name: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Last name associated with the address.'),
    company: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Company name associated with the address.'),
    phone: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Phone number associated with the address.'),
    address1: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('First line of the street address.'),
    address2: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Second line of the street address.'),
    city: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('City name.'),
    province: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Province or state name.'),
    province_code: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Province or state code.'),
    province_code_v2: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Alternative province code.'),
    country: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Country name.'),
    country_code: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('ISO country code.'),
    zip: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Postal or ZIP code.'),
    default: z
        .boolean()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Whether this is the default address for the customer.')
});

const CustomerSchema = z.object({
    id: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Unique identifier for the customer.'),
    email: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Customer email address.'),
    first_name: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Customer first name.'),
    last_name: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Customer last name.'),
    phone: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Customer phone number.'),
    state: z
        .number()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Customer state (e.g., 1 for active).'),
    verified_email: z
        .boolean()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Whether the email address has been verified.'),
    orders_count: z
        .number()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Total number of orders placed by the customer.'),
    total_spent: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Total amount spent by the customer.'),
    created_at: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('ISO 8601 timestamp of when the customer was created.'),
    updated_at: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('ISO 8601 timestamp of when the customer was last updated.'),
    accepts_marketing: z
        .boolean()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Whether the customer accepts marketing emails.'),
    accepts_marketing_updated_at: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Timestamp when the marketing consent was last updated.'),
    accepts_mobile_marketing: z
        .boolean()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Whether the customer accepts mobile marketing.'),
    accepts_mobile_marketing_updated_at: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Timestamp when mobile marketing consent was last updated.'),
    birthday: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Customer birthday in ISO 8601 or date format.'),
    currency: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Currency code used by the customer.'),
    default_address: AddressSchema.nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Default address for the customer.'),
    addresses: z
        .array(AddressSchema)
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('List of addresses associated with the customer.'),
    email_subscribe_flag: z
        .number()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Email subscription flag.'),
    gender: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Customer gender.'),
    language: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Customer preferred language.'),
    last_order_id: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('ID of the most recent order.'),
    last_order_name: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Name of the most recent order.'),
    mobile_subscribe_flag: z
        .number()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Mobile subscription flag.'),
    nick_name: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Customer nickname.'),
    tags: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined)
        .optional()
        .describe('Tags associated with the customer.')
});

const OutputSchema = z
    .object({
        customers: z.array(CustomerSchema).describe('List of customers matching the search criteria.'),
        next_page_info: z.string().optional().describe('Pagination cursor for the next page of results. Omitted when there are no more pages.')
    })
    .describe('Output containing a list of matching customers and an optional next-page cursor.');

function extractNextPageInfo(linkHeader: unknown): string | undefined {
    if (typeof linkHeader !== 'string') {
        return undefined;
    }
    const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/i);
    if (!match) {
        return undefined;
    }
    const urlString = match[1];
    if (urlString === undefined) {
        return undefined;
    }
    // @allowTryCatch: Safely parse the URL from the Link header; malformed URLs are ignored.
    try {
        const url = new URL(urlString);
        const pageInfo = url.searchParams.get('page_info');
        return pageInfo ?? undefined;
    } catch {
        return undefined;
    }
}

/**
 * @tags: [read]
 * @tagReason: Fuzzy and structured search of customer records via a read-only GET request.
 * @pitfalls: query_param is capped at 50 characters and only fuzzy-matches phone, email, first_name, last_name, address1, and address2.
 */
const action = createAction({
    description: 'Fuzzy/structured search for customers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/customer/customer/search-customers
            endpoint: '/admin/openapi/v20260601/customers/v2/search.json',
            params: {
                ...(input.query !== undefined && { query: input.query }),
                ...(input.query_param !== undefined && {
                    query_param: input.query_param
                }),
                ...(input.limit !== undefined && {
                    limit: String(input.limit)
                }),
                ...(input.cursor !== undefined && { page_info: input.cursor }),
                ...(input.order !== undefined && { order: input.order }),
                ...(input.fields !== undefined && { fields: input.fields })
            },
            retries: 3
        });

        const rawBody = z.object({ customers: z.array(z.unknown()) }).safeParse(response.data);
        if (!rawBody.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format: missing customers array.'
            });
        }

        const customers = rawBody.data.customers.map((item: unknown) => {
            const parsed = CustomerSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Failed to parse a customer record.',
                    details: parsed.error.message
                });
            }
            return parsed.data;
        });

        const nextPageInfo = extractNextPageInfo(response.headers?.['link']);

        return {
            customers,
            ...(nextPageInfo !== undefined && {
                next_page_info: nextPageInfo
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
