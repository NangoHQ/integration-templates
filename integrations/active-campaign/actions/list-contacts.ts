import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of results per page. Default: 20, Max: 100.'),
    email: z.string().optional().describe('Filter by exact email address.'),
    search: z.string().optional().describe('Filter contacts matching the value in names, organization, phone or email.'),
    listid: z.string().optional().describe('Filter contacts associated with the given list ID.'),
    tagid: z.number().int().optional().describe('Filter contacts associated with the given tag ID.'),
    status: z.number().int().optional().describe('Filter contacts by status.'),
    created_after: z.string().optional().describe('Filter contacts created after this date.'),
    created_before: z.string().optional().describe('Filter contacts created before this date.'),
    updated_after: z.string().optional().describe('Filter contacts updated after this date.'),
    updated_before: z.string().optional().describe('Filter contacts updated before this date.')
});

const ProviderContactSchema = z.object({
    id: z.string(),
    cdate: z.string().optional(),
    email: z.string(),
    phone: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    orgid: z.string().optional(),
    udate: z.string().optional()
});

const ProviderMetaSchema = z.object({
    total: z.string().optional()
});

const ProviderResponseSchema = z.object({
    contacts: z.array(z.unknown()).optional(),
    meta: ProviderMetaSchema.optional()
});

const ContactSchema = z.object({
    id: z.string(),
    email: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    phone: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    organization_id: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ContactSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List contacts from ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-contacts',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor !== undefined ? parseInt(input.cursor, 10) : 0;
        if (Number.isNaN(offset)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a valid numeric offset string.'
            });
        }

        const params: Record<string, string | number> = {};
        if (offset > 0) {
            params['offset'] = offset;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.email !== undefined) {
            params['email'] = input.email;
        }
        if (input.search !== undefined) {
            params['search'] = input.search;
        }
        if (input.listid !== undefined) {
            params['listid'] = input.listid;
        }
        if (input.tagid !== undefined) {
            params['tagid'] = input.tagid;
        }
        if (input.status !== undefined) {
            params['status'] = input.status;
        }
        if (input.created_after !== undefined) {
            params['filters[created_after]'] = input.created_after;
        }
        if (input.created_before !== undefined) {
            params['filters[created_before]'] = input.created_before;
        }
        if (input.updated_after !== undefined) {
            params['filters[updated_after]'] = input.updated_after;
        }
        if (input.updated_before !== undefined) {
            params['filters[updated_before]'] = input.updated_before;
        }

        // https://developers.activecampaign.com/reference/list-all-contacts
        const response = await nango.get({
            endpoint: '/3/contacts',
            params,
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response structure from ActiveCampaign.'
            });
        }

        const rawContacts = parsedResponse.data.contacts ?? [];
        const totalStr = parsedResponse.data.meta?.total;
        const total = totalStr !== undefined ? parseInt(totalStr, 10) : undefined;

        const contacts: Array<z.infer<typeof ContactSchema>> = [];
        for (const raw of rawContacts) {
            const parsed = ProviderContactSchema.safeParse(raw);
            if (parsed.success) {
                const c = parsed.data;
                contacts.push({
                    id: c.id,
                    email: c.email,
                    ...(c.firstName !== undefined && { first_name: c.firstName }),
                    ...(c.lastName !== undefined && { last_name: c.lastName }),
                    ...(c.phone !== undefined && { phone: c.phone }),
                    ...(c.cdate !== undefined && { created_at: c.cdate }),
                    ...(c.udate !== undefined && { updated_at: c.udate }),
                    ...(c.orgid !== undefined && { organization_id: c.orgid })
                });
            }
        }

        const limit = input.limit ?? 20;
        const nextOffset = offset + limit;
        const next_cursor = total !== undefined && !Number.isNaN(total) && nextOffset < total ? String(nextOffset) : undefined;

        return {
            items: contacts,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
