import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('Contact ID. Example: "c38e60e9-5992-45e5-8f81-d4b2d65c95b1"')
});

const PhoneSchema = z.object({
    type: z.string().optional(),
    value: z.string().optional()
});

const LocationSchema = z.object({
    name: z.string().optional()
});

const ProviderContactSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    headline: z.string().optional(),
    isAnonymized: z.boolean().optional(),
    location: LocationSchema.optional(),
    emails: z.array(z.string()).optional(),
    phones: z.array(PhoneSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    headline: z.string().optional(),
    isAnonymized: z.boolean().optional(),
    location: LocationSchema.optional(),
    emails: z.array(z.string()).optional(),
    phones: z.array(PhoneSchema).optional()
});

const action = createAction({
    description: "Retrieve a single contact (the person-level record shared across an individual's opportunities).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact:read:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://hire.lever.co/developer/documentation#contacts
            endpoint: `/v1/contacts/${encodeURIComponent(input.contactId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Contact not found: ${input.contactId}`
            });
        }

        const ApiResponseSchema = z.object({
            data: ProviderContactSchema
        });

        const parsedResponse = ApiResponseSchema.parse(response.data);
        const providerContact = parsedResponse.data;

        return {
            id: providerContact.id,
            ...(providerContact.name !== undefined && { name: providerContact.name }),
            ...(providerContact.headline !== undefined && { headline: providerContact.headline }),
            ...(providerContact.isAnonymized !== undefined && { isAnonymized: providerContact.isAnonymized }),
            ...(providerContact.location !== undefined && { location: providerContact.location }),
            ...(providerContact.emails !== undefined && { emails: providerContact.emails }),
            ...(providerContact.phones !== undefined && { phones: providerContact.phones })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
