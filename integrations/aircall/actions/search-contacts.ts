import { z } from 'zod';
import { createAction } from 'nango';

const PhoneNumberSchema = z.object({
    label: z.string(),
    value: z.string()
});

const EmailSchema = z.object({
    label: z.string(),
    value: z.string()
});

const ContactSchema = z.object({
    id: z.number().describe('Contact ID. Example: 711'),
    direct_link: z.string().describe('Direct API URL. Example: https://api.aircall.io/v1/contacts/711'),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    company_name: z.string().nullable(),
    information: z.string().nullable(),
    is_shared: z.boolean(),
    created_at: z.number().describe('Unix timestamp when the contact was created. Example: 1781777463'),
    updated_at: z.number().describe('Unix timestamp when the contact was last updated. Example: 1781777463'),
    phone_numbers: z.array(PhoneNumberSchema).optional(),
    emails: z.array(EmailSchema).optional()
});

const MetaSchema = z.object({
    count: z.number(),
    total: z.number(),
    current_page: z.number(),
    per_page: z.number(),
    next_page_link: z.string().nullable(),
    previous_page_link: z.string().nullable()
});

const InputSchema = z.object({
    query: z.string().describe('Search string to filter contacts by name, phone, or email.'),
    per_page: z.number().int().max(50).optional().describe('Number of results per page (max 50).'),
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
});

const OutputSchema = z.object({
    contacts: z.array(ContactSchema),
    meta: MetaSchema,
    next_page: z.number().optional().describe('Next page number for pagination.')
});

const action = createAction({
    description: 'Search contacts in Aircall by name, phone, or email.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/search-contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a valid positive integer string'
            });
        }

        const params: { query: string; page: number; per_page?: number } = {
            query: input.query,
            page: page
        };
        if (input.per_page !== undefined) {
            params.per_page = input.per_page;
        }

        // https://developer.aircall.io/api-references/#search-contacts
        const response = await nango.get({
            endpoint: '/v1/contacts/search',
            params: params,
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            meta: MetaSchema,
            contacts: z.array(z.unknown())
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const contacts = providerResponse.contacts.map((contact) => ContactSchema.parse(contact));

        return {
            contacts: contacts,
            meta: providerResponse.meta,
            ...(providerResponse.meta.next_page_link !== null && { next_page: providerResponse.meta.current_page + 1 })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
