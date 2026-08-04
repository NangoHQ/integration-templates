import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('Contact ID. Example: "6a71ddac92e09607f906db64"')
});

const ProviderPhoneSchema = z.object({
    number: z.string().optional(),
    type: z.string().optional()
});

const ProviderContactSchema = z.object({
    id: z.string(),
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    full_name: z.string().nullish(),
    email: z.string().nullish(),
    title: z.string().nullish(),
    phones: z.array(ProviderPhoneSchema).nullish(),
    is_archived: z.boolean().nullish(),
    status: z.string().nullish(),
    company_id: z.string().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish()
});

const OutputSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    full_name: z.string().optional(),
    email: z.string().optional(),
    title: z.string().optional(),
    phones: z.array(ProviderPhoneSchema).optional(),
    is_archived: z.boolean().optional(),
    status: z.string().optional(),
    company_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Get a single contact by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://api.ingenious.build/docs
            endpoint: `/api/v2/pub/contacts/${encodeURIComponent(input.contactId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found',
                contactId: input.contactId
            });
        }

        const providerContact = ProviderContactSchema.parse(response.data);

        return {
            id: providerContact.id,
            ...(providerContact.first_name != null && { first_name: providerContact.first_name }),
            ...(providerContact.last_name != null && { last_name: providerContact.last_name }),
            ...(providerContact.full_name != null && { full_name: providerContact.full_name }),
            ...(providerContact.email != null && { email: providerContact.email }),
            ...(providerContact.title != null && { title: providerContact.title }),
            ...(providerContact.phones != null && { phones: providerContact.phones }),
            ...(providerContact.is_archived != null && { is_archived: providerContact.is_archived }),
            ...(providerContact.status != null && { status: providerContact.status }),
            ...(providerContact.company_id != null && { company_id: providerContact.company_id }),
            ...(providerContact.created_at != null && { created_at: providerContact.created_at }),
            ...(providerContact.updated_at != null && { updated_at: providerContact.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
