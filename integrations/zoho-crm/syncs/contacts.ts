import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OwnerSchema = z.object({
    name: z.string().optional(),
    id: z.string(),
    email: z.string().optional()
});

const AccountNameSchema = z.object({
    name: z.string().optional(),
    id: z.string().optional()
});

const ReportingToSchema = z.object({
    name: z.string().optional(),
    id: z.string()
});

const _ProviderContactSchema = z.object({
    id: z.string(),
    First_Name: z.string().optional(),
    Last_Name: z.string().optional(),
    Full_Name: z.string().optional(),
    Email: z.string().nullable().optional(),
    Secondary_Email: z.string().nullable().optional(),
    Phone: z.string().nullable().optional(),
    Mobile: z.string().nullable().optional(),
    Home_Phone: z.string().nullable().optional(),
    Other_Phone: z.string().nullable().optional(),
    Title: z.string().nullable().optional(),
    Department: z.string().nullable().optional(),
    Account_Name: AccountNameSchema.optional(),
    Owner: OwnerSchema.optional(),
    Created_Time: z.string(),
    Modified_Time: z.string(),
    Mailing_Street: z.string().nullable().optional(),
    Mailing_City: z.string().nullable().optional(),
    Mailing_State: z.string().nullable().optional(),
    Mailing_Zip: z.string().nullable().optional(),
    Mailing_Country: z.string().nullable().optional(),
    Other_Street: z.string().nullable().optional(),
    Other_City: z.string().nullable().optional(),
    Other_State: z.string().nullable().optional(),
    Other_Zip: z.string().nullable().optional(),
    Other_Country: z.string().nullable().optional(),
    Description: z.string().nullable().optional(),
    Twitter: z.string().nullable().optional(),
    Skype_ID: z.string().nullable().optional(),
    Date_of_Birth: z.string().nullable().optional(),
    Lead_Source: z.string().nullable().optional(),
    Email_Opt_Out: z.boolean().optional(),
    Fax: z.string().nullable().optional(),
    Assistant: z.string().nullable().optional(),
    Asst_Phone: z.string().nullable().optional(),
    Reporting_To: ReportingToSchema.optional(),
    Created_By: OwnerSchema.optional(),
    Modified_By: OwnerSchema.optional()
});

const ContactSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    full_name: z.string().optional(),
    email: z.string().optional(),
    secondary_email: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    home_phone: z.string().optional(),
    other_phone: z.string().optional(),
    title: z.string().optional(),
    department: z.string().optional(),
    account_name: z.string().optional(),
    account_id: z.string().optional(),
    owner_name: z.string().optional(),
    owner_id: z.string().optional(),
    owner_email: z.string().optional(),
    created_time: z.string(),
    modified_time: z.string(),
    mailing_street: z.string().optional(),
    mailing_city: z.string().optional(),
    mailing_state: z.string().optional(),
    mailing_zip: z.string().optional(),
    mailing_country: z.string().optional(),
    other_street: z.string().optional(),
    other_city: z.string().optional(),
    other_state: z.string().optional(),
    other_zip: z.string().optional(),
    other_country: z.string().optional(),
    description: z.string().optional(),
    twitter: z.string().optional(),
    skype_id: z.string().optional(),
    date_of_birth: z.string().optional(),
    lead_source: z.string().optional(),
    email_opt_out: z.boolean().optional(),
    fax: z.string().optional(),
    assistant: z.string().optional(),
    asst_phone: z.string().optional(),
    reporting_to_name: z.string().optional(),
    reporting_to_id: z.string().optional(),
    created_by_name: z.string().optional(),
    created_by_id: z.string().optional(),
    modified_by_name: z.string().optional(),
    modified_by_id: z.string().optional()
});

const CheckpointSchema = z.object({
    modified_after: z.string(),
    page: z.number().int().positive()
});

const _DeletedContactSchema = z.object({
    id: z.string(),
    deleted_time: z.string(),
    display_name: z.string().nullable().optional(),
    type: z.string().optional()
});

type ProviderContact = z.infer<typeof _ProviderContactSchema>;
type Contact = z.infer<typeof ContactSchema>;
type DeletedContact = z.infer<typeof _DeletedContactSchema>;

function mapProviderContact(providerContact: ProviderContact): Contact {
    return {
        id: providerContact.id,
        first_name: providerContact.First_Name,
        last_name: providerContact.Last_Name,
        full_name: providerContact.Full_Name,
        email: providerContact.Email ?? undefined,
        secondary_email: providerContact.Secondary_Email ?? undefined,
        phone: providerContact.Phone ?? undefined,
        mobile: providerContact.Mobile ?? undefined,
        home_phone: providerContact.Home_Phone ?? undefined,
        other_phone: providerContact.Other_Phone ?? undefined,
        title: providerContact.Title ?? undefined,
        department: providerContact.Department ?? undefined,
        account_name: providerContact.Account_Name?.name,
        account_id: providerContact.Account_Name?.id,
        owner_name: providerContact.Owner?.name,
        owner_id: providerContact.Owner?.id,
        owner_email: providerContact.Owner?.email,
        created_time: providerContact.Created_Time,
        modified_time: providerContact.Modified_Time,
        mailing_street: providerContact.Mailing_Street ?? undefined,
        mailing_city: providerContact.Mailing_City ?? undefined,
        mailing_state: providerContact.Mailing_State ?? undefined,
        mailing_zip: providerContact.Mailing_Zip ?? undefined,
        mailing_country: providerContact.Mailing_Country ?? undefined,
        other_street: providerContact.Other_Street ?? undefined,
        other_city: providerContact.Other_City ?? undefined,
        other_state: providerContact.Other_State ?? undefined,
        other_zip: providerContact.Other_Zip ?? undefined,
        other_country: providerContact.Other_Country ?? undefined,
        description: providerContact.Description ?? undefined,
        twitter: providerContact.Twitter ?? undefined,
        skype_id: providerContact.Skype_ID ?? undefined,
        date_of_birth: providerContact.Date_of_Birth ?? undefined,
        lead_source: providerContact.Lead_Source ?? undefined,
        email_opt_out: providerContact.Email_Opt_Out,
        fax: providerContact.Fax ?? undefined,
        assistant: providerContact.Assistant ?? undefined,
        asst_phone: providerContact.Asst_Phone ?? undefined,
        reporting_to_name: providerContact.Reporting_To?.name,
        reporting_to_id: providerContact.Reporting_To?.id,
        created_by_name: providerContact.Created_By?.name,
        created_by_id: providerContact.Created_By?.id,
        modified_by_name: providerContact.Modified_By?.name,
        modified_by_id: providerContact.Modified_By?.id
    };
}

const sync = createSync({
    description: 'Sync contacts from Zoho CRM',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Contact: ContactSchema
    },
    endpoints: [{ method: 'POST', path: '/syncs/contacts' }],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let modifiedAfter: string | undefined = checkpoint?.['modified_after'] || undefined;
        const previousModifiedAfter = modifiedAfter;
        let page: number | undefined = checkpoint?.['page'] ?? 1;
        let lastProcessedModifiedAt: string | undefined;

        const headers: Record<string, string> = {};
        if (modifiedAfter) {
            headers['If-Modified-Since'] = modifiedAfter;
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
            endpoint: '/crm/v2/Contacts',
            headers,
            params: {
                sort_order: 'asc',
                sort_by: 'Modified_Time'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 200,
                response_path: 'data',
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate<ProviderContact>(proxyConfig)) {
            const contacts = pageResults.map(mapProviderContact);

            if (contacts.length === 0) {
                if (page === undefined && lastProcessedModifiedAt) {
                    await nango.saveCheckpoint({
                        modified_after: lastProcessedModifiedAt,
                        page: 1
                    });
                }
                continue;
            }

            await nango.batchSave(contacts, 'Contact');
            const lastContact = contacts[contacts.length - 1];
            if (lastContact) {
                lastProcessedModifiedAt = lastContact.modified_time;
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({
                    modified_after: modifiedAfter ?? '',
                    page
                });
            } else if (lastProcessedModifiedAt) {
                modifiedAfter = lastProcessedModifiedAt;
                await nango.saveCheckpoint({
                    modified_after: modifiedAfter,
                    page: 1
                });
            }
        }

        // Fetch and process deleted contacts
        // https://www.zoho.com/crm/developer/docs/api/v2/get-deleted-records.html
        if (previousModifiedAfter) {
            const deletedHeaders: Record<string, string> = {
                'If-Modified-Since': previousModifiedAfter
            };

            // https://www.zoho.com/crm/developer/docs/api/v2/get-deleted-records.html
            const deletedProxyConfig: ProxyConfiguration = {
                // https://www.zoho.com/crm/developer/docs/api/v2/get-deleted-records.html
                endpoint: '/crm/v2/Contacts/deleted',
                headers: deletedHeaders,
                params: {
                    type: 'all'
                },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_start_value: 1,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'per_page',
                    limit: 200,
                    response_path: 'data'
                },
                retries: 3
            };

            const deletedContacts: Array<{ id: string }> = [];
            for await (const pageResults of nango.paginate<DeletedContact>(deletedProxyConfig)) {
                const deletions = pageResults.filter((record) => record.id).map((record) => ({ id: record.id }));
                deletedContacts.push(...deletions);
            }

            if (deletedContacts.length > 0) {
                await nango.batchDelete(deletedContacts, 'Contact');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
