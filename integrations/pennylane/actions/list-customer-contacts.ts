import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customer_id: z.number().describe('Customer ID. Example: 1338468995072'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20 if not specified. Must be between 1 and 100.')
});

const ProviderContactSchema = z.object({
    id: z.number(),
    first_name: z.string(),
    last_name: z.string(),
    role: z.string(),
    email: z.string(),
    telephone_number: z.string(),
    mobile_number: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderResponseSchema = z.object({
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
    items: z.array(ProviderContactSchema)
});

const ContactSchema = z.object({
    id: z.number(),
    first_name: z.string(),
    last_name: z.string(),
    role: z.string(),
    email: z.string(),
    telephone_number: z.string(),
    mobile_number: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    items: z.array(ContactSchema),
    next_cursor: z.string().optional(),
    has_more: z.boolean()
});

const action = createAction({
    description: 'List contacts for a customer',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customers:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getcustomercontacts
            endpoint: `/api/external/v2/customers/${encodeURIComponent(String(input.customer_id))}/contacts`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            items: parsed.items.map((item) => ({
                id: item.id,
                first_name: item.first_name,
                last_name: item.last_name,
                role: item.role,
                email: item.email,
                telephone_number: item.telephone_number,
                mobile_number: item.mobile_number,
                created_at: item.created_at,
                updated_at: item.updated_at
            })),
            ...(parsed.next_cursor != null && { next_cursor: parsed.next_cursor }),
            has_more: parsed.has_more
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
