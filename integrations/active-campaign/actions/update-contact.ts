import { z } from 'zod';
import { createAction } from 'nango';

const FieldValueInputSchema = z.object({
    field: z.string(),
    value: z.string()
});

const InputSchema = z.object({
    id: z.number().describe('ID of the contact to update. Example: 1'),
    email: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    fieldValues: z.array(FieldValueInputSchema).optional()
});

const ProviderContactSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    phone: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    contact: ProviderContactSchema
});

const OutputSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional()
});

const action = createAction({
    description: 'Update a contact in ActiveCampaign.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const contactData: {
            email?: string;
            firstName?: string;
            lastName?: string;
            phone?: string;
            fieldValues?: Array<{ field: string; value: string }>;
        } = {};

        if (input.email !== undefined) {
            contactData.email = input.email;
        }
        if (input.firstName !== undefined) {
            contactData.firstName = input.firstName;
        }
        if (input.lastName !== undefined) {
            contactData.lastName = input.lastName;
        }
        if (input.phone !== undefined) {
            contactData.phone = input.phone;
        }
        if (input.fieldValues !== undefined) {
            contactData.fieldValues = input.fieldValues;
        }

        const response = await nango.patch({
            // https://developers.activecampaign.com/reference/update-a-contact-new
            endpoint: `/3/contacts/${encodeURIComponent(String(input.id))}`,
            data: {
                contact: contactData
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const contact = providerResponse.contact;

        return {
            id: contact.id,
            ...(contact.email !== undefined && { email: contact.email }),
            ...(contact.firstName != null && { firstName: contact.firstName }),
            ...(contact.lastName != null && { lastName: contact.lastName }),
            ...(contact.phone != null && { phone: contact.phone })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
