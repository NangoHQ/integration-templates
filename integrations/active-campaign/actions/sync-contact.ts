import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().email().describe('Contact email address'),
    firstName: z.string().optional().describe('Contact first name'),
    lastName: z.string().optional().describe('Contact last name'),
    phone: z.string().optional().describe('Contact phone number')
});

const ProviderContactSchema = z.object({
    id: z.string(),
    email: z.string(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    phone: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    contact: ProviderContactSchema
});

const OutputSchema = z.object({
    id: z.string(),
    email: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional()
});

const action = createAction({
    description: 'Create or update an ActiveCampaign contact by email.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.activecampaign.com/reference/sync-a-contacts-data
            endpoint: '/3/contact/sync',
            data: {
                contact: {
                    email: input.email,
                    ...(input.firstName !== undefined && { firstName: input.firstName }),
                    ...(input.lastName !== undefined && { lastName: input.lastName }),
                    ...(input.phone !== undefined && { phone: input.phone })
                }
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const contact = parsed.contact;

        return {
            id: contact.id,
            email: contact.email,
            ...(contact.firstName != null && { firstName: contact.firstName }),
            ...(contact.lastName != null && { lastName: contact.lastName }),
            ...(contact.phone != null && { phone: contact.phone })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
