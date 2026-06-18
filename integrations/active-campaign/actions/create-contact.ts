import { z } from 'zod';
import { createAction } from 'nango';

const FieldValueInputSchema = z.object({
    field: z.string().describe('Custom field ID. Example: "1"'),
    value: z.string().describe('Custom field value. Example: "The Value"')
});

const InputSchema = z.object({
    email: z.string().email().describe('Contact email address. Example: "johndoe@example.com"'),
    firstName: z.string().optional().describe('Contact first name. Example: "John"'),
    lastName: z.string().optional().describe('Contact last name. Example: "Doe"'),
    phone: z.string().optional().describe('Contact phone number. Example: "7223224241"'),
    fieldValues: z.array(FieldValueInputSchema).optional().describe('Custom field values to set on the contact')
});

const ProviderFieldValueSchema = z.object({
    field: z.string().optional(),
    value: z.string().nullable().optional()
});

const ProviderContactSchema = z.object({
    id: z.string(),
    email: z.string(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    cdate: z.string().nullable().optional(),
    udate: z.string().nullable().optional(),
    fieldValues: z.array(ProviderFieldValueSchema).optional()
});

const ProviderResponseSchema = z.object({
    contact: ProviderContactSchema
});

const OutputSchema = z.object({
    id: z.string().describe('Contact ID. Example: "123"'),
    email: z.string().describe('Contact email address. Example: "johndoe@example.com"'),
    firstName: z.string().optional().describe('Contact first name. Example: "John"'),
    lastName: z.string().optional().describe('Contact last name. Example: "Doe"'),
    phone: z.string().optional().describe('Contact phone number. Example: "7223224241"'),
    cdate: z.string().optional().describe('Contact creation date. Example: "2024-01-01T00:00:00-00:00"'),
    udate: z.string().optional().describe('Contact update date. Example: "2024-01-01T00:00:00-00:00"'),
    fieldValues: z
        .array(
            z.object({
                field: z.string().optional(),
                value: z.string().optional()
            })
        )
        .optional()
        .describe('Custom field values on the contact')
});

const action = createAction({
    description: 'Create a contact in ActiveCampaign.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: {
            contact: {
                email: string;
                firstName?: string;
                lastName?: string;
                phone?: string;
                fieldValues?: Array<{ field: string; value: string }>;
            };
        } = {
            contact: {
                email: input.email,
                ...(input.firstName !== undefined && { firstName: input.firstName }),
                ...(input.lastName !== undefined && { lastName: input.lastName }),
                ...(input.phone !== undefined && { phone: input.phone }),
                ...(input.fieldValues !== undefined && { fieldValues: input.fieldValues })
            }
        };

        const response = await nango.post({
            // https://developers.activecampaign.com/reference/create-a-new-contact
            endpoint: '/3/contacts',
            data: payload,
            retries: 10
        });

        if (response.status !== 201 && response.status !== 200) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Unexpected status ${response.status} from ActiveCampaign`,
                status: response.status
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);
        const contact = parsed.contact;

        return {
            id: contact.id,
            email: contact.email,
            ...(contact.firstName != null && { firstName: contact.firstName }),
            ...(contact.lastName != null && { lastName: contact.lastName }),
            ...(contact.phone != null && { phone: contact.phone }),
            ...(contact.cdate != null && { cdate: contact.cdate }),
            ...(contact.udate != null && { udate: contact.udate }),
            ...(contact.fieldValues !== undefined && {
                fieldValues: contact.fieldValues.map((fv) => ({
                    ...(fv.field !== undefined && { field: fv.field }),
                    ...(fv.value != null && { value: fv.value })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
