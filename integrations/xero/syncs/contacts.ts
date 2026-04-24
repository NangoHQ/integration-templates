import { createSync, type NangoSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const ContactSchema = z.object({
    id: z.string(),
    name: z.string(),
    external_id: z.string().optional(),
    email: z.string().optional(),
    tax_number: z.string().optional(),
    address_line_1: z.string().optional(),
    address_line_2: z.string().optional(),
    city: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
    state: z.string().optional(),
    phone: z.string().optional()
});

const XeroAddressSchema = z.object({
    AddressType: z.string().optional(),
    AddressLine1: z.string().nullable().optional(),
    AddressLine2: z.string().nullable().optional(),
    City: z.string().nullable().optional(),
    Region: z.string().nullable().optional(),
    PostalCode: z.string().nullable().optional(),
    Country: z.string().nullable().optional()
});

const XeroPhoneSchema = z.object({
    PhoneType: z.string().optional(),
    PhoneNumber: z.string().nullable().optional(),
    PhoneAreaCode: z.string().nullable().optional(),
    PhoneCountryCode: z.string().nullable().optional()
});

const XeroContactSchema = z.object({
    ContactID: z.string(),
    ContactStatus: z.string(),
    Name: z.string(),
    FirstName: z.string().optional(),
    LastName: z.string().optional(),
    EmailAddress: z.string().nullable().optional(),
    ContactNumber: z.string().nullable().optional(),
    TaxNumber: z.string().nullable().optional(),
    UpdatedDateUTC: z.string(),
    Addresses: z.array(XeroAddressSchema).optional(),
    Phones: z.array(XeroPhoneSchema).optional()
});

const XeroConnectionSchema = z.object({
    tenantId: z.string()
});

function parseXeroDate(dateString: string): Date | null {
    const match = dateString.match(/\/Date\((\d+)([+-]\d{4})\)\//);
    if (match && match[1]) {
        return new Date(parseInt(match[1], 10));
    }
    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime())) {
        return isoDate;
    }
    return null;
}

function formatIfModifiedSince(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, '');
}

async function getTenantId(nango: NangoSync): Promise<string> {
    const connection = await nango.getConnection();

    if (connection.connection_config && typeof connection.connection_config['tenant_id'] === 'string') {
        return connection.connection_config['tenant_id'];
    }

    if (connection.metadata && typeof connection.metadata['tenantId'] === 'string') {
        return connection.metadata['tenantId'];
    }

    // https://developer.xero.com/documentation/api/accounting/overview#connections
    const res = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    const connections = z.array(XeroConnectionSchema).parse(res.data);
    if (connections.length === 1) {
        const connection = connections[0];
        if (connection) {
            return connection.tenantId;
        }
    }

    throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
}

function mapXeroContact(xeroContact: z.infer<typeof XeroContactSchema>) {
    const streetAddress = xeroContact.Addresses?.find((addr) => addr.AddressType === 'POBOX');
    const defaultPhone = xeroContact.Phones?.find((phone) => phone.PhoneType === 'DEFAULT');

    let phone: string | undefined;
    if (defaultPhone?.PhoneNumber) {
        phone = defaultPhone.PhoneCountryCode
            ? `+${defaultPhone.PhoneCountryCode}${defaultPhone.PhoneAreaCode}${defaultPhone.PhoneNumber}`
            : `${defaultPhone.PhoneAreaCode}${defaultPhone.PhoneNumber}`;
    }

    return {
        id: xeroContact.ContactID,
        name: xeroContact.Name,
        external_id: xeroContact.ContactNumber || undefined,
        tax_number: xeroContact.TaxNumber || undefined,
        email: xeroContact.EmailAddress || undefined,
        address_line_1: streetAddress?.AddressLine1 || undefined,
        address_line_2: streetAddress?.AddressLine2 || undefined,
        city: streetAddress?.City || undefined,
        zip: streetAddress?.PostalCode || undefined,
        country: streetAddress?.Country || undefined,
        state: streetAddress?.Region || undefined,
        phone
    };
}

interface Config extends ProxyConfiguration {
    params: Record<string, string | number>;
}

const sync = createSync({
    description: 'Sync contacts from Xero.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/contacts'
        }
    ],
    scopes: ['accounting.contacts'],
    models: {
        Contact: ContactSchema
    },
    exec: async (nango) => {
        const tenantId = await getTenantId(nango);
        const checkpoint = await nango.getCheckpoint();

        const config: Config = {
            // https://developer.xero.com/documentation/api/accounting/contacts
            endpoint: 'api.xro/2.0/Contacts',
            headers: {
                'xero-tenant-id': tenantId
            },
            params: {
                order: 'UpdatedDateUTC ASC',
                includeArchived: 'false'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                response_path: 'Contacts',
                offset_calculation_method: 'per-page',
                offset_start_value: 1
            },
            retries: 10
        };

        if (checkpoint && checkpoint.updated_after.length > 0) {
            config.headers = Object.assign({}, config.headers, { 'If-Modified-Since': checkpoint.updated_after });
            config.params['includeArchived'] = 'true';
        }

        for await (const contacts of nango.paginate(config)) {
            if (!Array.isArray(contacts)) {
                continue;
            }

            const validatedContacts = contacts.map((c) => XeroContactSchema.parse(c));

            const activeContacts = validatedContacts.filter((c) => c.ContactStatus === 'ACTIVE');
            if (activeContacts.length > 0) {
                await nango.batchSave(activeContacts.map(mapXeroContact), 'Contact');
            }

            if (checkpoint) {
                const archivedContacts = validatedContacts.filter((c) => c.ContactStatus === 'ARCHIVED');
                if (archivedContacts.length > 0) {
                    await nango.batchDelete(archivedContacts.map(mapXeroContact), 'Contact');
                }
            }

            let latestDate: string | null = null;
            for (const contact of validatedContacts) {
                const currentDate = parseXeroDate(contact.UpdatedDateUTC);
                if (currentDate) {
                    if (!latestDate) {
                        latestDate = contact.UpdatedDateUTC;
                    } else {
                        const latestDateObj = parseXeroDate(latestDate);
                        if (latestDateObj && currentDate > latestDateObj) {
                            latestDate = contact.UpdatedDateUTC;
                        }
                    }
                }
            }

            if (latestDate) {
                const parsed = parseXeroDate(latestDate);
                if (parsed) {
                    await nango.saveCheckpoint({
                        updated_after: formatIfModifiedSince(parsed)
                    });
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
