import * as z from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    name: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    role: z.string().optional(),
    custom_attributes: z.record(z.string(), z.unknown()).nullable().optional()
});

const ProviderContactSchema = z.object({
    id: z.string(),
    type: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
    name: z.string().nullable(),
    role: z.string(),
    custom_attributes: z.record(z.string(), z.unknown()).nullable(),
    created_at: z.number(),
    updated_at: z.number()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
    name: z.string().nullable(),
    role: z.string(),
    custom_attributes: z.record(z.string(), z.unknown()).nullable(),
    created_at: z.number(),
    updated_at: z.number()
});

interface UpdateContactBody {
    email?: string;
    name?: string | null;
    phone?: string | null;
    role?: string;
    custom_attributes?: Record<string, unknown> | null;
}

const action = createAction({
    description: 'Update mutable fields on an existing contact.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-contact',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: UpdateContactBody = {};

        if (input.email !== undefined) {
            body.email = input.email;
        }
        if (input.name !== undefined) {
            body.name = input.name === null ? null : input.name;
        }
        if (input.phone !== undefined) {
            body.phone = input.phone === null ? null : input.phone;
        }
        if (input.role !== undefined) {
            if (input.role !== 'user' && input.role !== 'lead') {
                throw new nango.ActionError({
                    type: 'invalid_role',
                    message: 'Role must be either "user" or "lead"'
                });
            }
            body.role = input.role;
        }
        if (input.custom_attributes !== undefined) {
            body.custom_attributes = input.custom_attributes;
        }

        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Contacts/updateContact
        const response = await nango.put({
            endpoint: `/contacts/${encodeURIComponent(input.id)}`,
            data: body,
            retries: 3,
            headers: {
                'Intercom-Version': '2.11'
            }
        });

        const contact = ProviderContactSchema.parse(response.data);

        return {
            id: contact.id,
            type: contact.type,
            email: contact.email,
            phone: contact.phone,
            name: contact.name,
            role: contact.role,
            custom_attributes: contact.custom_attributes,
            created_at: contact.created_at,
            updated_at: contact.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
