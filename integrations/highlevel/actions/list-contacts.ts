import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page. Example: "2"'),
    limit: z.number().optional().describe('Maximum number of contacts to return per page. Defaults to 100. Example: 50'),
    query: z.string().optional().describe('Search query string to filter contacts. Example: "john"')
});

const ContactSchema = z
    .object({
        id: z.string().describe('Contact ID. Example: "ocQHyuzHvysMo5N5VsXc"'),
        locationId: z.string().describe('Location ID. Example: "C2QujeCh8ZnC7al2InWR"'),
        email: z.string().nullable().optional().describe('Primary email address. Example: "JohnDeo@gmail.com"'),
        firstName: z.string().nullable().optional().describe('First name. Example: "John"'),
        lastName: z.string().nullable().optional().describe('Last name. Example: "Doe"'),
        phone: z.string().nullable().optional().describe('Primary phone number. Example: "+1234567890"'),
        tags: z.array(z.string()).optional().describe('List of tag names. Example: ["nisi sint commodo amet", "consequat"]'),
        customFields: z
            .array(
                z
                    .object({
                        id: z.string().optional(),
                        value: z.string().nullable().optional()
                    })
                    .passthrough()
            )
            .optional(),
        dateAdded: z.string().nullable().optional().describe('ISO 8601 timestamp when the contact was created. Example: "2020-10-29T09:31:30.255Z"'),
        dateUpdated: z.string().nullable().optional().describe('ISO 8601 timestamp when the contact was last updated. Example: "2020-10-29T09:31:30.255Z"'),
        type: z.string().nullable().optional().describe('Contact type. Example: "lead"'),
        country: z.string().nullable().optional().describe('Country code. Example: "US"'),
        city: z.string().nullable().optional().describe('City. Example: "New York"'),
        state: z.string().nullable().optional().describe('State. Example: "NY"'),
        address: z.string().nullable().optional().describe('Street address. Example: "123 Main St"'),
        postalCode: z.string().nullable().optional().describe('Postal code. Example: "10001"'),
        companyName: z.string().nullable().optional().describe('Company name. Example: "Acme Inc"'),
        website: z.string().nullable().optional().describe('Website URL. Example: "https://example.com"'),
        source: z.string().nullable().optional().describe('Contact source. Example: "xyz form"'),
        assignedTo: z.string().nullable().optional().describe('User ID the contact is assigned to. Example: "ocQHyuzHvysMo5N5VsXc"'),
        followers: z.array(z.string()).optional().describe('List of follower user IDs. Example: ["641c094001436dbc2081e642"]'),
        dnd: z.boolean().optional().describe('Do-not-disturb flag.'),
        timezone: z.string().nullable().optional().describe('Timezone. Example: "America/New_York"'),
        businessId: z.string().nullable().optional().describe('Business ID. Example: "641c094001436dbc2081e642"'),
        businessName: z.string().nullable().optional().describe('Business name. Example: "Acme Business"'),
        phoneLabel: z.string().nullable().optional().describe('Phone label. Example: "mobile"'),
        additionalEmails: z.array(z.string()).optional().describe('Additional email addresses. Example: ["other@example.com"]'),
        additionalPhones: z.array(z.string()).optional().describe('Additional phone numbers. Example: ["+1987654321"]'),
        dateOfBirth: z.string().nullable().optional().describe('Date of birth. Example: "1990-01-01"'),
        validEmail: z.boolean().nullable().optional().describe('Whether the email is valid.'),
        dndSettings: z.object({}).passthrough().optional(),
        inboundDndSettings: z.object({}).passthrough().optional(),
        attributionSource: z.object({}).passthrough().optional(),
        lastAttributionSource: z.object({}).passthrough().optional()
    })
    .passthrough();

const ListOutputSchema = z.object({
    contacts: z.array(ContactSchema).describe('List of contacts matching the search criteria.'),
    nextCursor: z.string().optional().describe('Cursor to fetch the next page of results. Omitted when there are no more pages.')
});

const action = createAction({
    description: 'List contacts from HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['contacts.readonly'],

    exec: async (nango, input) => {
        const connection = await nango.getConnection();
        const rawLocationIdFromConfig = connection.connection_config?.['locationId'];
        let locationId = typeof rawLocationIdFromConfig === 'string' ? rawLocationIdFromConfig : undefined;
        if (!locationId) {
            const metadata = await nango.getMetadata();
            const MetadataSchema = z.object({
                locationId: z.string()
            });
            const parsedMetadata = MetadataSchema.safeParse(metadata);
            if (parsedMetadata.success) {
                locationId = parsedMetadata.data.locationId;
            }
        }
        if (!locationId) {
            throw new nango.ActionError({
                type: 'missing_metadata',
                message: 'locationId is required in connection configuration or metadata.'
            });
        }

        const pageLimit = input.limit !== undefined && Number.isInteger(input.limit) && input.limit > 0 ? input.limit : 100;
        const page = input.cursor !== undefined ? Number(input.cursor) : 1;
        if (Number.isNaN(page) || !Number.isInteger(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer string.'
            });
        }

        const response = await nango.post({
            // https://marketplace.gohighlevel.com/docs/ghl/contacts/search-contacts-advanced
            endpoint: '/contacts/search',
            headers: {
                Version: '2021-07-28'
            },
            data: {
                locationId: locationId,
                pageLimit: pageLimit,
                page: page,
                ...(input.query !== undefined && input.query !== '' && { query: input.query })
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            contacts: z.array(z.object({}).passthrough()).optional(),
            total: z.number().optional()
        });
        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from HighLevel API.'
            });
        }

        const rawContacts = parsedResponse.data.contacts || [];
        const total = parsedResponse.data.total || 0;

        const contacts = rawContacts.map((rawContact) => {
            const parsed = ContactSchema.safeParse(rawContact);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_contact',
                    message: 'A contact in the response did not match the expected schema.'
                });
            }
            return parsed.data;
        });

        const hasNextPage = contacts.length === pageLimit && page * pageLimit < total;

        return {
            contacts: contacts,
            ...(hasNextPage && { nextCursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
