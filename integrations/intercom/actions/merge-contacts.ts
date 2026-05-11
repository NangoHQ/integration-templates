import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    from: z.string().describe('The ID of the lead contact to merge. Example: "66c1b0a6c1234567890abcdef"'),
    into: z.string().describe('The ID of the user contact to merge into. Example: "66c1b0a6c1234567890fedcba"')
});

const ProviderContactSchema = z.object({
    id: z.string(),
    role: z.enum(['user', 'lead', 'admin']),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    user_id: z.string().nullable().optional(),
    company_id: z.string().nullable().optional(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
    last_seen_at: z.number().int().nullable().optional(),
    avatar: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    role: z.enum(['user', 'lead', 'admin']),
    name: z.string().optional(),
    email: z.string().optional(),
    user_id: z.string().optional(),
    company_id: z.string().optional(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
    last_seen_at: z.number().int().optional(),
    avatar: z.string().optional()
});

const action = createAction({
    description: 'Merge a lead into a user contact.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/merge-contacts',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts'], // Intercom contact management scope

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Contacts/mergeContact
        const response = await nango.post({
            endpoint: '/contacts/merge',
            data: {
                from: input.from,
                into: input.into
            },
            retries: 3,
            headers: {
                'Intercom-Version': '2.11'
            }
        });

        if (response.status !== 200 || !response.data) {
            throw new nango.ActionError({
                type: 'merge_failed',
                message: 'Failed to merge contacts',
                from: input.from,
                into: input.into
            });
        }

        const providerContact = ProviderContactSchema.parse(response.data);

        return {
            id: providerContact.id,
            role: providerContact.role,
            ...(providerContact.name != null && { name: providerContact.name }),
            ...(providerContact.email != null && { email: providerContact.email }),
            ...(providerContact.user_id != null && { user_id: providerContact.user_id }),
            ...(providerContact.company_id != null && { company_id: providerContact.company_id }),
            created_at: providerContact.created_at,
            updated_at: providerContact.updated_at,
            ...(providerContact.last_seen_at != null && { last_seen_at: providerContact.last_seen_at }),
            ...(providerContact.avatar != null && { avatar: providerContact.avatar })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
