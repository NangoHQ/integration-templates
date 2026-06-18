import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        role: z
            .union([z.literal('user'), z.literal('lead')])
            .describe('The role of the contact. "user" for identified contacts (with email or user_id), "lead" for anonymous contacts.'),
        email: z.string().email().optional().describe('Email address of the contact. Required for users, optional for leads.'),
        name: z.string().optional().describe('Full name of the contact.'),
        custom_attributes: z.record(z.string(), z.unknown()).optional().describe('Custom attributes as key-value pairs.')
    })
    .superRefine((data, ctx) => {
        if (data.role === 'user' && !data.email) {
            ctx.addIssue({ code: 'custom', message: 'email is required for user contacts', path: ['email'] });
        }
    });

const ProviderContactSchema = z
    .object({
        id: z.string(),
        type: z.union([z.literal('contact'), z.literal('user'), z.literal('lead')]),
        role: z.union([z.literal('user'), z.literal('lead')]),
        email: z.string().email().nullable().optional(),
        name: z.string().nullable().optional(),
        external_id: z.string().nullable().optional(),
        user_id: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        avatar: z.string().nullable().optional(),
        created_at: z.number().optional(),
        updated_at: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    role: z.union([z.literal('user'), z.literal('lead')]),
    email: z.string().email().optional(),
    name: z.string().optional(),
    external_id: z.string().optional(),
    user_id: z.string().optional(),
    phone: z.string().optional(),
    avatar: z.string().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional()
});

const action = createAction({
    description: 'Create a contact (user or lead) in Intercom.',
    version: '3.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Contacts/createContact
        const response = await nango.post({
            endpoint: '/contacts',
            headers: {
                'Intercom-Version': '2.11'
            },
            data: {
                role: input.role,
                ...(input.email !== undefined && { email: input.email }),
                ...(input.name !== undefined && { name: input.name }),
                ...(input.custom_attributes !== undefined && { custom_attributes: input.custom_attributes })
            },
            retries: 3
        });

        const providerContact = ProviderContactSchema.parse(response.data);

        return {
            id: providerContact.id,
            role: providerContact.role,
            ...(providerContact.email !== undefined && providerContact.email !== null && { email: providerContact.email }),
            ...(providerContact.name !== undefined && providerContact.name !== null && { name: providerContact.name }),
            ...(providerContact.external_id !== undefined && providerContact.external_id !== null && { external_id: providerContact.external_id }),
            ...(providerContact.user_id !== undefined && providerContact.user_id !== null && { user_id: providerContact.user_id }),
            ...(providerContact.phone !== undefined && providerContact.phone !== null && { phone: providerContact.phone }),
            ...(providerContact.avatar !== undefined && providerContact.avatar !== null && { avatar: providerContact.avatar }),
            ...(providerContact.created_at !== undefined && providerContact.created_at !== null && { created_at: providerContact.created_at }),
            ...(providerContact.updated_at !== undefined && providerContact.updated_at !== null && { updated_at: providerContact.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
