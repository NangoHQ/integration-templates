import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        email: z.string().email().optional().describe('Contact email to search for duplicates. Example: "user@example.com"'),
        phone: z.string().optional().describe('Contact phone number to search for duplicates. Example: "+15550100001"')
    })
    .refine((data) => Boolean(data.email) || Boolean(data.phone), {
        message: 'Either email or phone must be provided.'
    });

const MetadataSchema = z.object({
    locationId: z.string()
});

const ProviderContactSchema = z.object({
    id: z.string(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    locationId: z.string().nullable().optional(),
    tags: z.array(z.string()).nullable().optional()
});

const ProviderResponseSchema = z.object({
    contact: ProviderContactSchema.nullable().optional(),
    matchingField: z.string().nullable().optional(),
    traceId: z.string().optional()
});

const OutputSchema = z.object({
    duplicateFound: z.boolean(),
    contact: z
        .object({
            id: z.string(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            email: z.string().optional(),
            phone: z.string().optional(),
            locationId: z.string().optional(),
            tags: z.array(z.string()).optional()
        })
        .optional(),
    matchingField: z.string().optional()
});

const action = createAction({
    description: 'Look up an existing contact by email or phone to avoid creating duplicates.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'missing_metadata',
                message: 'locationId is missing or invalid in metadata.'
            });
        }
        const locationId = parsedMetadata.data.locationId;

        const params: { locationId: string; email?: string; number?: string } = {
            locationId
        };
        if (input.email) {
            params.email = input.email;
        }
        if (input.phone) {
            params.number = input.phone;
        }

        const response = await nango.get({
            // https://highlevel.stoplight.io/docs/integrations/get-duplicate-contact
            endpoint: '/contacts/search/duplicate',
            params,
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Provider returned an unexpected response shape.',
                details: parsed.error.issues
            });
        }

        const data = parsed.data;
        if (!data.contact) {
            return {
                duplicateFound: false
            };
        }

        const contact = data.contact;
        return {
            duplicateFound: true,
            contact: {
                id: contact.id,
                ...(contact.firstName != null && { firstName: contact.firstName }),
                ...(contact.lastName != null && { lastName: contact.lastName }),
                ...(contact.email != null && { email: contact.email }),
                ...(contact.phone != null && { phone: contact.phone }),
                ...(contact.locationId != null && { locationId: contact.locationId }),
                ...(contact.tags != null && { tags: contact.tags })
            },
            ...(data.matchingField != null && { matchingField: data.matchingField })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
