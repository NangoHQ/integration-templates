import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        email: z.string().optional().describe('Filter by customer email address.'),
        external_id: z.string().optional().describe('Filter by external ID.'),
        language: z.string().optional().describe('Filter by language code (ISO 639-1).'),
        limit: z.number().int().max(100).optional().describe('Maximum number of results per page (max 100). Defaults to 30.'),
        name: z.string().optional().describe('Filter by customer name.'),
        order_by: z.string().optional().describe('Sort order, e.g. "created_datetime:asc" or "updated_datetime:desc".'),
        timezone: z.string().optional().describe('Filter by timezone (IANA timezone name).'),
        view_id: z.number().int().optional().describe('Filter by view ID.'),
        channel_type: z.string().optional().describe('Filter by channel type (e.g., "email", "phone").'),
        channel_address: z.string().optional().describe('Filter by channel address.')
    })
    .describe('Input for listing customers with optional filters.');

const ProviderCustomerSchema = z.object({
    id: z.number().int(),
    name: z.string().nullable().optional(),
    firstname: z.string().nullable().optional(),
    lastname: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    external_id: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    timezone: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    created_datetime: z.string().nullable().optional(),
    updated_datetime: z.string().nullable().optional(),
    channels: z.array(z.object({ id: z.number().int() }).passthrough()).optional(),
    integrations: z.record(z.string(), z.unknown()).optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderCustomerSchema),
    meta: z.object({
        prev_cursor: z.string().nullable().optional(),
        next_cursor: z.string().nullable().optional()
    })
});

const CustomerSchema = z
    .object({
        id: z.number().int().describe('ID of the customer.'),
        name: z.string().optional().describe('Full name of the customer.'),
        firstname: z.string().optional().describe('First name of the customer.'),
        lastname: z.string().optional().describe('Last name of the customer.'),
        email: z.string().optional().describe('Primary email address of the customer.'),
        external_id: z.string().optional().describe('ID of the customer in a foreign system (Stripe, Aircall, etc.).'),
        language: z.string().optional().describe("The customer's preferred language (ISO 639-1)."),
        timezone: z.string().optional().describe("The customer's preferred timezone (IANA timezone name)."),
        note: z.string().optional().describe('A note associated with the customer.'),
        created_datetime: z.string().optional().describe('When the customer was created.'),
        updated_datetime: z.string().optional().describe('When the customer was last updated.'),
        channels: z
            .array(z.object({ id: z.number().int().describe('ID of the customer channel.') }).passthrough())
            .optional()
            .describe("The customer's contact channels."),
        integrations: z.record(z.string(), z.unknown()).optional().describe('Data coming from integrations associated with the customer.')
    })
    .describe('A customer object.');

const OutputSchema = z
    .object({
        customers: z.array(CustomerSchema).describe('List of customers matching the query.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page. Absent when there are no more pages.')
    })
    .describe('Output for listing customers.');

/**
 * @tags: [read]
 * @tagReason: Reads the list of customers from the provider.
 * @pitfalls: No modified-since filter is available; order_by only changes sort order.
 */
const action = createAction({
    description: 'List customers, optionally filtered by email, name, external ID, language, timezone, view, or channel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customers:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.gorgias.com/reference/list-customers
        const response = await nango.get({
            endpoint: '/api/customers',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.external_id !== undefined && { external_id: input.external_id }),
                ...(input.language !== undefined && { language: input.language }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.name !== undefined && { name: input.name }),
                ...(input.order_by !== undefined && { order_by: input.order_by }),
                ...(input.timezone !== undefined && { timezone: input.timezone }),
                ...(input.view_id !== undefined && { view_id: input.view_id }),
                ...(input.channel_type !== undefined && { channel_type: input.channel_type }),
                ...(input.channel_address !== undefined && { channel_address: input.channel_address })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const customers = providerResponse.data.map((customer) => {
            return {
                id: customer.id,
                ...(customer.name != null && { name: customer.name }),
                ...(customer.firstname != null && { firstname: customer.firstname }),
                ...(customer.lastname != null && { lastname: customer.lastname }),
                ...(customer.email != null && { email: customer.email }),
                ...(customer.external_id != null && { external_id: customer.external_id }),
                ...(customer.language != null && { language: customer.language }),
                ...(customer.timezone != null && { timezone: customer.timezone }),
                ...(customer.note != null && { note: customer.note }),
                ...(customer.created_datetime != null && { created_datetime: customer.created_datetime }),
                ...(customer.updated_datetime != null && { updated_datetime: customer.updated_datetime }),
                ...(customer.channels !== undefined && { channels: customer.channels }),
                ...(customer.integrations !== undefined && { integrations: customer.integrations })
            };
        });

        return {
            customers,
            ...(providerResponse.meta.next_cursor != null && { next_cursor: providerResponse.meta.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
