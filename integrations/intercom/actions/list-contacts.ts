import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    per_page: z.number().optional().describe('Number of results per page (default 50, max 150).')
});

const ContactSchema = z.object({
    type: z.literal('contact'),
    id: z.string(),
    external_id: z.string().nullable().optional(),
    workspace_id: z.string(),
    role: z.union([z.literal('user'), z.literal('lead')]),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    owner_id: z.number().nullable().optional(),
    has_hard_bounced: z.boolean().optional(),
    marked_email_as_spam: z.boolean().optional(),
    unsubscribed_from_emails: z.boolean().optional(),
    created_at: z.number(),
    updated_at: z.number(),
    signed_up_at: z.number().nullable().optional(),
    last_seen_at: z.number().nullable().optional(),
    last_replied_at: z.number().nullable().optional(),
    last_contacted_at: z.number().nullable().optional(),
    last_email_opened_at: z.number().nullable().optional(),
    last_email_clicked_at: z.number().nullable().optional(),
    language_override: z.string().nullable().optional(),
    browser: z.string().nullable().optional(),
    browser_version: z.string().nullable().optional(),
    browser_language: z.string().nullable().optional(),
    os: z.string().nullable().optional(),
    custom_attributes: z.record(z.string(), z.unknown()).optional()
});

const PagesSchema = z.object({
    type: z.literal('pages'),
    page: z.number(),
    per_page: z.number(),
    total_pages: z.number(),
    next: z
        .object({
            starting_after: z.string()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    type: z.literal('list'),
    data: z.array(ContactSchema),
    total_count: z.number(),
    pages: PagesSchema.nullable()
});

const OutputSchema = z.object({
    contacts: z.array(ContactSchema),
    total_count: z.number(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List contacts with cursor-based pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-contacts',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.cursor) {
            params['starting_after'] = input.cursor;
        }

        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }

        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Contacts/listcontacts
        const response = await nango.get({
            endpoint: '/contacts',
            params,
            retries: 3,
            headers: {
                'Intercom-Version': '2.11'
            }
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            contacts: providerResponse.data,
            total_count: providerResponse.total_count,
            ...(providerResponse.pages?.next?.starting_after !== undefined && {
                next_cursor: providerResponse.pages.next.starting_after
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
