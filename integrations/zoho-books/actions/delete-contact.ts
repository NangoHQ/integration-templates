import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contact_id: z.string().describe('Contact ID. Example: "260815000000097001"')
});

const MetadataSchema = z.object({
    organization_id: z.string().describe('Organization ID. Example: "927270289"')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z.object({
    contact_id: z.string(),
    success: z.boolean(),
    message: z.string()
});

const action = createAction({
    description: 'Delete or archive a contact in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-contact',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['ZohoBooks.contacts.DELETE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'organization_id is required in metadata.'
            });
        }

        const organizationId = parsedMetadata.data.organization_id;
        const contactId = input.contact_id;

        // https://www.zoho.com/books/api/v3/contacts/#delete-a-contact
        const response = await nango.delete({
            endpoint: `/books/v3/contacts/${encodeURIComponent(contactId)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Books API.',
                details: parsedResponse.error.message
            });
        }

        const providerResponse = parsedResponse.data;

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message,
                code: providerResponse.code
            });
        }

        return {
            contact_id: contactId,
            success: providerResponse.code === 0,
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
