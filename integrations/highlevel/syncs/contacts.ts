import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    locationId: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    search_after: z.string()
});

const SearchAfterTupleSchema = z.tuple([z.number(), z.string()]);

const CustomFieldSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        fieldKey: z.string().optional(),
        value: z.unknown().optional()
    })
    .passthrough();

const ProviderContactSchema = z.object({
    id: z.string(),
    locationId: z.string(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    postalCode: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    companyName: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    dateAdded: z.string(),
    dateUpdated: z.string(),
    tags: z.array(z.string()).optional(),
    customFields: z.array(CustomFieldSchema).optional(),
    type: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    assignedTo: z.string().nullable().optional(),
    searchAfter: z.tuple([z.number(), z.string()])
});

const ProviderContactsResponseSchema = z.object({
    contacts: z.array(ProviderContactSchema),
    total: z.number().optional(),
    traceId: z.string().optional()
});

const ContactSchema = z.object({
    id: z.string(),
    locationId: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    companyName: z.string().optional(),
    website: z.string().optional(),
    dateAdded: z.string(),
    dateUpdated: z.string(),
    tags: z.array(z.string()).optional(),
    customFields: z.array(CustomFieldSchema).optional(),
    type: z.string().optional(),
    source: z.string().optional(),
    assignedTo: z.string().optional()
});

const sync = createSync({
    description: 'Sync contacts from HighLevel',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const connectionSchema = z.object({
            connection_config: z.record(z.string(), z.unknown()).optional(),
            metadata: z.record(z.string(), z.unknown()).optional()
        });
        const parsedConnection = connectionSchema.safeParse(connection);

        let rawLocationId = parsedConnection.success
            ? (parsedConnection.data.connection_config?.['locationId'] ?? parsedConnection.data.metadata?.['locationId'])
            : undefined;
        if (typeof rawLocationId !== 'string') {
            const metadata = await nango.getMetadata();
            const parsedMetadata = MetadataSchema.safeParse(metadata);
            if (parsedMetadata.success) {
                rawLocationId = parsedMetadata.data.locationId;
            }
        }
        if (typeof rawLocationId !== 'string') {
            throw new Error('locationId is required in connection configuration or metadata');
        }
        const locationId = rawLocationId;

        const checkpoint = await nango.getCheckpoint();
        let updatedAfter = '1970-01-01T00:00:00.000Z';
        let searchAfter: [number, string] | undefined;

        if (checkpoint) {
            const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
            if (parsedCheckpoint.success) {
                updatedAfter = parsedCheckpoint.data.updated_after;
                if (parsedCheckpoint.data.search_after !== '[]') {
                    const parsed = SearchAfterTupleSchema.safeParse(JSON.parse(parsedCheckpoint.data.search_after));
                    if (parsed.success) {
                        searchAfter = parsed.data;
                    }
                }
            }
        }

        let maxDateUpdated = updatedAfter;

        // The HighLevel search API returns the next cursor (`searchAfter`) inside the last
        // record of the array, not in a top-level response field. Because `nango.paginate`
        // requires `cursor_path_in_response` to point to a fixed response path, it cannot
        // extract the cursor from the final array item, so a manual loop is necessary.
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
        while (true) {
            // https://highlevel.stoplight.io/docs/integrations/contacts/search-contacts-advanced
            const response = await nango.post({
                endpoint: '/contacts/search',
                headers: {
                    Version: '2021-07-28'
                },
                data: {
                    locationId: locationId,
                    pageLimit: 100,
                    sort: [{ field: 'dateUpdated', direction: 'asc' }],
                    ...(searchAfter && { searchAfter: searchAfter })
                },
                retries: 3
            });

            const parsedResponse = ProviderContactsResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error('Invalid response from HighLevel contacts search');
            }

            const contacts = parsedResponse.data.contacts;
            if (contacts.length === 0) {
                break;
            }

            const mappedContacts = contacts.map((contact) => ({
                id: contact.id,
                locationId: contact.locationId,
                ...(contact.firstName != null && { firstName: contact.firstName }),
                ...(contact.lastName != null && { lastName: contact.lastName }),
                ...(contact.email != null && { email: contact.email }),
                ...(contact.phone != null && { phone: contact.phone }),
                ...(contact.address != null && { address: contact.address }),
                ...(contact.city != null && { city: contact.city }),
                ...(contact.state != null && { state: contact.state }),
                ...(contact.postalCode != null && { postalCode: contact.postalCode }),
                ...(contact.country != null && { country: contact.country }),
                ...(contact.companyName != null && { companyName: contact.companyName }),
                ...(contact.website != null && { website: contact.website }),
                dateAdded: contact.dateAdded,
                dateUpdated: contact.dateUpdated,
                ...(contact.tags != null && { tags: contact.tags }),
                ...(contact.customFields != null && { customFields: contact.customFields }),
                ...(contact.type != null && { type: contact.type }),
                ...(contact.source != null && { source: contact.source }),
                ...(contact.assignedTo != null && { assignedTo: contact.assignedTo })
            }));

            await nango.batchSave(mappedContacts, 'Contact');

            const lastContact = contacts[contacts.length - 1];
            if (!lastContact) {
                break;
            }

            if (lastContact.dateUpdated > maxDateUpdated) {
                maxDateUpdated = lastContact.dateUpdated;
            }

            await nango.saveCheckpoint({
                updated_after: maxDateUpdated,
                search_after: JSON.stringify(lastContact.searchAfter)
            });

            searchAfter = lastContact.searchAfter;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
