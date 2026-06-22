import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    per_page: z.number().int().min(1).max(50).optional().describe('Number of results per page. Default is 20, maximum is 50.')
});

const ProviderEmailSchema = z.object({
    id: z.number(),
    label: z.string(),
    value: z.string()
});

const ProviderPhoneNumberSchema = z.object({
    id: z.number(),
    label: z.string(),
    value: z.string()
});

const ProviderContactSchema = z.object({
    id: z.number(),
    direct_link: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    company_name: z.string().nullish(),
    information: z.string().nullish(),
    is_shared: z.boolean(),
    created_at: z.number(),
    updated_at: z.number(),
    emails: z.array(ProviderEmailSchema),
    phone_numbers: z.array(ProviderPhoneNumberSchema)
});

const ProviderMetaSchema = z.object({
    count: z.number(),
    total: z.number(),
    current_page: z.number(),
    per_page: z.number(),
    next_page_link: z.string().nullable(),
    previous_page_link: z.string().nullable()
});

const ProviderResponseSchema = z.object({
    meta: ProviderMetaSchema,
    contacts: z.array(ProviderContactSchema)
});

const ContactOutputSchema = z.object({
    id: z.number(),
    direct_link: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    company_name: z.string().optional(),
    information: z.string().optional(),
    is_shared: z.boolean(),
    created_at: z.number(),
    updated_at: z.number(),
    emails: z.array(ProviderEmailSchema).optional(),
    phone_numbers: z.array(ProviderPhoneNumberSchema).optional()
});

const ListOutputSchema = z.object({
    items: z.array(ContactOutputSchema),
    next_cursor: z.string().optional().describe('Pagination cursor for the next page. Omitted when there are no more pages.')
});

const action = createAction({
    description: 'List contacts from Aircall.',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const response = await nango.get({
            // https://developer.aircall.io/api-references/#list-all-contacts
            endpoint: '/v1/contacts',
            params: {
                ...(input.cursor !== undefined && { page: Number(input.cursor) }),
                ...(input.per_page !== undefined && { per_page: input.per_page })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const next_cursor = providerResponse.meta.next_page_link != null ? String(providerResponse.meta.current_page + 1) : undefined;

        return {
            items: providerResponse.contacts.map((contact) => ({
                id: contact.id,
                direct_link: contact.direct_link,
                ...(contact.first_name !== undefined && { first_name: contact.first_name }),
                ...(contact.last_name !== undefined && { last_name: contact.last_name }),
                ...(contact.company_name != null && { company_name: contact.company_name }),
                ...(contact.information != null && { information: contact.information }),
                is_shared: contact.is_shared,
                created_at: contact.created_at,
                updated_at: contact.updated_at,
                emails: contact.emails,
                phone_numbers: contact.phone_numbers
            })),
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
