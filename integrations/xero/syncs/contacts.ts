import { createSync } from 'nango';
import { z } from 'zod';

// https://developer.xero.com/documentation/api/accounting/contacts
const ContactSchema = z.object({
    id: z.string(),
    contactId: z.string(),
    name: z.nullable(z.string()),
    firstName: z.nullable(z.string()),
    lastName: z.nullable(z.string()),
    emailAddress: z.nullable(z.string()),
    phones: z.array(z.record(z.string(), z.unknown())),
    isSupplier: z.boolean(),
    isCustomer: z.boolean(),
    status: z.string(),
    updatedAt: z.string()
});

const CheckpointSchema = z.object({
    modifiedAfter: z.string()
});

const XeroContactSchema = z.object({
    ContactID: z.string(),
    Name: z.optional(z.nullable(z.string())),
    FirstName: z.optional(z.nullable(z.string())),
    LastName: z.optional(z.nullable(z.string())),
    EmailAddress: z.optional(z.nullable(z.string())),
    Phones: z.optional(z.array(z.record(z.string(), z.unknown()))),
    IsSupplier: z.optional(z.boolean()),
    IsCustomer: z.optional(z.boolean()),
    ContactStatus: z.optional(z.nullable(z.string())),
    UpdatedDateUTC: z.optional(z.nullable(z.string()))
});

const TenantResponseSchema = z.object({
    data: z.array(z.record(z.string(), z.unknown()))
});

async function resolveTenantId(nango: {
    getConnection: () => Promise<{
        connection_config: Record<string, unknown>;
        metadata: Record<string, unknown> | null;
    }>;
    get: (config: { endpoint: string; retries: number }) => Promise<unknown>;
}): Promise<string> {
    const connection = await nango.getConnection();

    // 1. Check connection_config['tenant_id']
    const configTenantId = connection.connection_config['tenant_id'];
    if (typeof configTenantId === 'string' && configTenantId) {
        return configTenantId;
    }

    // 2. Check metadata['tenantId']
    const metadata = connection.metadata;
    if (metadata) {
        const metadataTenantId = metadata['tenantId'];
        if (typeof metadataTenantId === 'string' && metadataTenantId) {
            return metadataTenantId;
        }
    }

    // 3. Call GET connections and use first tenant
    // https://developer.xero.com/documentation/api/accounting/overview#connections
    const response = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    const parsed = TenantResponseSchema.parse(response);
    if (!Array.isArray(parsed.data) || parsed.data.length === 0) {
        throw new Error('No tenants found. Please connect a Xero organization.');
    }

    if (parsed.data.length > 1) {
        throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
    }

    const firstTenant = parsed.data[0];
    if (firstTenant && typeof firstTenant['tenantId'] === 'string') {
        return firstTenant['tenantId'];
    }

    throw new Error('Unable to resolve tenantId from connection.');
}

const sync = createSync<{ Contact: typeof ContactSchema }, undefined, typeof CheckpointSchema>({
    description: 'Sync contacts from Xero',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/contacts' }],
    checkpoint: CheckpointSchema,
    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const tenantId = await resolveTenantId(nango);

        const isIncremental = checkpoint && checkpoint.modifiedAfter.length > 0;

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        if (isIncremental) {
            headers['If-Modified-Since'] = new Date(checkpoint.modifiedAfter).toISOString().slice(0, 19);
        }

        let page = 1;
        let hasMore = true;
        let latestUpdatedAt = checkpoint?.modifiedAfter ?? '';

        while (hasMore) {
            // https://developer.xero.com/documentation/api/accounting/contacts
            const response = await nango.get({
                endpoint: 'api.xro/2.0/Contacts',
                headers,
                params: {
                    page,
                    pageSize: 100,
                    includeArchived: isIncremental ? 'true' : 'false'
                },
                retries: 10
            });

            const contactsArray = z.object({ Contacts: z.array(z.unknown()) }).parse(response.data).Contacts;

            if (contactsArray.length === 0) {
                hasMore = false;
                break;
            }

            const contacts = contactsArray
                .map((raw) => {
                    const parsed = XeroContactSchema.safeParse(raw);
                    if (!parsed.success) {
                        return null;
                    }
                    const data = parsed.data;
                    const updatedAt = data.UpdatedDateUTC ?? '';
                    if (updatedAt && updatedAt > latestUpdatedAt) {
                        latestUpdatedAt = updatedAt;
                    }
                    return {
                        id: data.ContactID,
                        contactId: data.ContactID,
                        name: data.Name ?? null,
                        firstName: data.FirstName ?? null,
                        lastName: data.LastName ?? null,
                        emailAddress: data.EmailAddress ?? null,
                        phones: data.Phones ?? [],
                        isSupplier: data.IsSupplier ?? false,
                        isCustomer: data.IsCustomer ?? false,
                        status: data.ContactStatus ?? 'ACTIVE',
                        updatedAt
                    };
                })
                .filter((c): c is NonNullable<typeof c> => c !== null);

            const activeContacts = contacts.filter((c) => c.status === 'ACTIVE');
            await nango.batchSave(activeContacts, 'Contact');

            if (isIncremental) {
                const archivedContacts = contacts.filter((c) => c.status === 'ARCHIVED');
                await nango.batchDelete(archivedContacts, 'Contact');
            }

            if (contactsArray.length < 100) {
                hasMore = false;
            } else {
                page += 1;
            }
        }

        if (latestUpdatedAt !== (checkpoint?.modifiedAfter ?? '')) {
            await nango.saveCheckpoint({ modifiedAfter: latestUpdatedAt });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
