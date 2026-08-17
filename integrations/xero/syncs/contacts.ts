import { createSync } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z
    .object({
        updated_after: z.string().describe('The UTC timestamp from the previous sync used for the If-Modified-Since header.')
    })
    .describe('Checkpoint that stores the latest UpdatedDateUTC processed to enable incremental contact syncing.');

const ContactSchema = z
    .object({
        id: z.string().describe('The unique Xero identifier for the contact.'),
        contact_status: z.string().describe('The current status of the contact, such as ACTIVE or ARCHIVED.'),
        name: z.string().optional().describe('The full display name of the contact or organisation.'),
        first_name: z.string().optional().describe('The first name of the contact person.'),
        last_name: z.string().optional().describe('The last name of the contact person.'),
        email_address: z.string().optional().describe('The primary email address for the contact.'),
        updated_date_utc: z.string().describe('The UTC date and time when the contact was last updated in Xero.'),
        is_supplier: z.boolean().optional().describe('Whether the contact is flagged as a supplier.'),
        is_customer: z.boolean().optional().describe('Whether the contact is flagged as a customer.'),
        has_attachments: z.boolean().optional().describe('Whether the contact has file attachments stored in Xero.')
    })
    .describe('A Xero contact representing a customer, supplier, or other entity.');

const ConnectionSchema = z.object({
    tenantId: z.string()
});

const XeroContactSchema = z.object({
    ContactID: z.string(),
    ContactStatus: z.string(),
    Name: z.string().nullish(),
    FirstName: z.string().nullish(),
    LastName: z.string().nullish(),
    EmailAddress: z.string().nullish(),
    UpdatedDateUTC: z.string(),
    IsSupplier: z.boolean().nullish(),
    IsCustomer: z.boolean().nullish(),
    HasAttachments: z.boolean().nullish()
});

function parseXeroDate(value: string): Date | null {
    const match = value.match(/^\/Date\((-?\d+)(?:[+-]\d{4})?\)\/$/);
    if (match && match[1]) {
        return new Date(parseInt(match[1], 10));
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
}

function formatIfModifiedSince(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, '');
}

function mapContact(raw: unknown) {
    const parsed = XeroContactSchema.safeParse(raw);
    if (!parsed.success) {
        throw new Error(`Failed to parse contact: ${parsed.error.message}`);
    }
    const c = parsed.data;
    return {
        id: c.ContactID,
        contact_status: c.ContactStatus,
        ...(c.Name != null && { name: c.Name }),
        ...(c.FirstName != null && { first_name: c.FirstName }),
        ...(c.LastName != null && { last_name: c.LastName }),
        ...(c.EmailAddress != null && { email_address: c.EmailAddress }),
        updated_date_utc: c.UpdatedDateUTC,
        ...(c.IsSupplier != null && { is_supplier: c.IsSupplier }),
        ...(c.IsCustomer != null && { is_customer: c.IsCustomer }),
        ...(c.HasAttachments != null && { has_attachments: c.HasAttachments })
    };
}

async function resolveTenantId(nango: Parameters<(typeof sync)['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();

    const connectionConfigParsed = z
        .object({
            tenant_id: z.string().optional()
        })
        .safeParse(connection?.connection_config);

    if (connectionConfigParsed.success && connectionConfigParsed.data.tenant_id) {
        return connectionConfigParsed.data.tenant_id;
    }

    const metadataParsed = z
        .object({
            tenantId: z.string().optional()
        })
        .safeParse(connection?.metadata);

    if (metadataParsed.success && metadataParsed.data.tenantId) {
        return metadataParsed.data.tenantId;
    }

    // https://developer.xero.com/documentation/api/accounting/overview
    const connectionsResponse = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    const connectionsParsed = z.array(ConnectionSchema).safeParse(connectionsResponse.data);
    if (!connectionsParsed.success || connectionsParsed.data.length === 0) {
        throw new Error('No Xero tenants found for this connection.');
    }

    const connections = connectionsParsed.data;
    if (connections.length > 1) {
        throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
    }

    const firstConnection = connections[0];
    if (firstConnection && firstConnection.tenantId.length > 0) {
        return firstConnection.tenantId;
    }

    throw new Error('Unable to resolve xero-tenant-id.');
}

const sync = createSync({
    description: 'Sync contacts from Xero.',
    version: '3.1.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const tenantId = await resolveTenantId(nango);

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        const params: Record<string, string> = {
            summaryOnly: 'true',
            order: 'UpdatedDateUTC ASC'
        };

        if (checkpoint && checkpoint.updated_after.length > 0) {
            headers['If-Modified-Since'] = checkpoint.updated_after;
            params['includeArchived'] = 'true';
        }

        // https://developer.xero.com/documentation/api/accounting/overview
        const proxyConfig: {
            endpoint: string;
            headers: Record<string, string>;
            params: Record<string, string>;
            paginate: {
                type: 'offset';
                offset_name_in_request: string;
                offset_start_value: number;
                offset_calculation_method: 'per-page';
                limit_name_in_request: string;
                limit: number;
                response_path: string;
            };
            retries: number;
        } = {
            endpoint: 'api.xro/2.0/Contacts',
            headers,
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                response_path: 'Contacts',
                offset_calculation_method: 'per-page',
                offset_start_value: 1,
                limit_name_in_request: 'pageSize',
                limit: 100
            },
            retries: 10
        };

        for await (const records of nango.paginate(proxyConfig)) {
            const contacts: unknown[] = [];
            for (const record of records) {
                contacts.push(record);
            }

            if (contacts.length === 0) {
                continue;
            }

            const activeContacts = contacts
                .filter((raw) => {
                    const parsed = z.object({ ContactStatus: z.string() }).safeParse(raw);
                    return parsed.success && parsed.data.ContactStatus === 'ACTIVE';
                })
                .map(mapContact);

            const archivedContacts = contacts
                .filter((raw) => {
                    const parsed = z.object({ ContactStatus: z.string() }).safeParse(raw);
                    return parsed.success && parsed.data.ContactStatus === 'ARCHIVED';
                })
                .map(mapContact);

            if (activeContacts.length > 0) {
                await nango.batchSave(activeContacts, 'Contact');
            }

            if (checkpoint && archivedContacts.length > 0) {
                await nango.batchDelete(archivedContacts, 'Contact');
            }

            let latestUpdatedDate: Date | null = null;

            for (const raw of contacts) {
                const parsed = z.object({ UpdatedDateUTC: z.string() }).safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse UpdatedDateUTC: ${parsed.error.message}`);
                }

                const parsedDate = parseXeroDate(parsed.data.UpdatedDateUTC);
                if (!parsedDate) {
                    throw new Error(`Failed to parse UpdatedDateUTC value: ${parsed.data.UpdatedDateUTC}`);
                }

                if (!latestUpdatedDate || parsedDate > latestUpdatedDate) {
                    latestUpdatedDate = parsedDate;
                }
            }

            if (latestUpdatedDate) {
                await nango.saveCheckpoint({ updated_after: formatIfModifiedSince(latestUpdatedDate) });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
