import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Raw provider schemas (keep provider casing)
const OwnerSchema = z.object({
    name: z.string().nullish(),
    id: z.string(),
    email: z.string().nullish()
});

const ProviderLeadSchema = z
    .object({
        id: z.string(),
        Company: z.string().nullish(),
        Email: z.string().nullish(),
        First_Name: z.string().nullish(),
        Last_Name: z.string(),
        Full_Name: z.string().nullish(),
        Phone: z.string().nullish(),
        Mobile: z.string().nullish(),
        Lead_Status: z.string().nullish(),
        Lead_Source: z.string().nullish(),
        Designation: z.string().nullish(),
        Website: z.string().nullish(),
        Industry: z.string().nullish(),
        Annual_Revenue: z.number().nullish(),
        No_of_Employees: z.number().nullish(),
        Skype_ID: z.string().nullish(),
        Twitter: z.string().nullish(),
        Street: z.string().nullish(),
        City: z.string().nullish(),
        State: z.string().nullish(),
        Zip_Code: z.string().nullish(),
        Country: z.string().nullish(),
        Description: z.string().nullish(),
        Email_Opt_Out: z.boolean().nullish(),
        Created_Time: z.string(),
        Modified_Time: z.string(),
        Created_By: OwnerSchema.nullish(),
        Modified_By: OwnerSchema.nullish(),
        Owner: OwnerSchema.nullish(),
        Rating: z.string().nullish(),
        Fax: z.string().nullish(),
        Secondary_Email: z.string().nullish(),
        Tag: z.array(z.object({ name: z.string(), id: z.string() })).nullish()
    })
    .passthrough();

// Normalized output model
const LeadSchema = z.object({
    id: z.string(),
    company: z.string().optional(),
    email: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string(),
    fullName: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    status: z.string().optional(),
    source: z.string().optional(),
    designation: z.string().optional(),
    website: z.string().optional(),
    industry: z.string().optional(),
    annualRevenue: z.number().optional(),
    employees: z.number().optional(),
    skypeId: z.string().optional(),
    twitter: z.string().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
    description: z.string().optional(),
    emailOptOut: z.boolean().optional(),
    createdTime: z.string(),
    modifiedTime: z.string(),
    createdById: z.string().optional(),
    createdByName: z.string().optional(),
    createdByEmail: z.string().optional(),
    modifiedById: z.string().optional(),
    modifiedByName: z.string().optional(),
    modifiedByEmail: z.string().optional(),
    ownerId: z.string().optional(),
    ownerName: z.string().optional(),
    ownerEmail: z.string().optional(),
    rating: z.string().optional(),
    fax: z.string().optional(),
    secondaryEmail: z.string().optional(),
    tags: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    page: z.number().int().positive()
});

const DeletedLeadSchema = z.object({
    id: z.string(),
    deleted_time: z.string().optional(),
    display_name: z.string().nullish(),
    type: z.string().optional()
});

type Lead = z.infer<typeof LeadSchema>;
type ProviderLead = z.infer<typeof ProviderLeadSchema>;

const sync = createSync({
    description: 'Sync leads from Zoho CRM',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Lead: LeadSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/leads'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let updatedAfter: string | undefined = checkpoint?.updated_after || undefined;
        const previousUpdatedAfter = updatedAfter;
        let page: number | undefined = checkpoint?.page ?? 1;
        let lastProcessedUpdatedAt: string | undefined;

        const headers: Record<string, string> = {};
        if (updatedAfter) {
            headers['If-Modified-Since'] = updatedAfter;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
            endpoint: '/crm/v2/Leads',
            ...(Object.keys(headers).length > 0 ? { headers } : {}),
            params: {
                sort_by: 'Modified_Time',
                sort_order: 'asc'
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

        for await (const pageResults of nango.paginate<ProviderLead>(proxyConfig)) {
            const leads: Lead[] = [];

            for (const rawRecord of pageResults) {
                const parsedRecord = ProviderLeadSchema.safeParse(rawRecord);
                if (!parsedRecord.success) {
                    await nango.log(`Failed to parse lead record: ${JSON.stringify(parsedRecord.error.issues)}`, {
                        level: 'error'
                    });
                    continue;
                }

                const record = parsedRecord.data;
                lastProcessedUpdatedAt = record.Modified_Time;

                leads.push({
                    id: record.id,
                    ...(record.Company && { company: record.Company }),
                    ...(record.Email && { email: record.Email }),
                    ...(record.First_Name && { firstName: record.First_Name }),
                    lastName: record.Last_Name,
                    ...(record.Full_Name && { fullName: record.Full_Name }),
                    ...(record.Phone && { phone: record.Phone }),
                    ...(record.Mobile && { mobile: record.Mobile }),
                    ...(record.Lead_Status && { status: record.Lead_Status }),
                    ...(record.Lead_Source && { source: record.Lead_Source }),
                    ...(record.Designation && { designation: record.Designation }),
                    ...(record.Website && { website: record.Website }),
                    ...(record.Industry && { industry: record.Industry }),
                    ...(record.Annual_Revenue !== null && record.Annual_Revenue !== undefined && { annualRevenue: record.Annual_Revenue }),
                    ...(record.No_of_Employees !== null && record.No_of_Employees !== undefined && { employees: record.No_of_Employees }),
                    ...(record.Skype_ID && { skypeId: record.Skype_ID }),
                    ...(record.Twitter && { twitter: record.Twitter }),
                    ...(record.Street && { street: record.Street }),
                    ...(record.City && { city: record.City }),
                    ...(record.State && { state: record.State }),
                    ...(record.Zip_Code && { zipCode: record.Zip_Code }),
                    ...(record.Country && { country: record.Country }),
                    ...(record.Description && { description: record.Description }),
                    ...(record.Email_Opt_Out !== null && record.Email_Opt_Out !== undefined && { emailOptOut: record.Email_Opt_Out }),
                    createdTime: record.Created_Time,
                    modifiedTime: record.Modified_Time,
                    ...(record.Created_By && {
                        createdById: record.Created_By.id,
                        ...(record.Created_By.name && { createdByName: record.Created_By.name }),
                        ...(record.Created_By.email && { createdByEmail: record.Created_By.email })
                    }),
                    ...(record.Modified_By && {
                        modifiedById: record.Modified_By.id,
                        ...(record.Modified_By.name && { modifiedByName: record.Modified_By.name }),
                        ...(record.Modified_By.email && { modifiedByEmail: record.Modified_By.email })
                    }),
                    ...(record.Owner && {
                        ownerId: record.Owner.id,
                        ...(record.Owner.name && { ownerName: record.Owner.name }),
                        ...(record.Owner.email && { ownerEmail: record.Owner.email })
                    }),
                    ...(record.Rating && { rating: record.Rating }),
                    ...(record.Fax && { fax: record.Fax }),
                    ...(record.Secondary_Email && { secondaryEmail: record.Secondary_Email }),
                    ...(record.Tag && record.Tag.length > 0 && { tags: record.Tag.map((t) => t.name) })
                });
            }

            if (leads.length === 0) {
                if (page === undefined && lastProcessedUpdatedAt) {
                    await nango.saveCheckpoint({
                        updated_after: lastProcessedUpdatedAt,
                        page: 1
                    });
                }
                continue;
            }

            await nango.batchSave(leads, 'Lead');

            if (page !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter ?? '',
                    page
                });
            } else if (lastProcessedUpdatedAt) {
                updatedAfter = lastProcessedUpdatedAt;
                await nango.saveCheckpoint({
                    updated_after: updatedAfter,
                    page: 1
                });
            }
        }

        if (previousUpdatedAfter) {
            const deletedLeads: Array<{ id: string }> = [];
            const deletedProxyConfig: ProxyConfiguration = {
                // https://www.zoho.com/crm/developer/docs/api/v2/get-deleted-records.html
                endpoint: '/crm/v2/Leads/deleted',
                headers: {
                    'If-Modified-Since': previousUpdatedAfter
                },
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

            for await (const pageResults of nango.paginate<z.infer<typeof DeletedLeadSchema>>(deletedProxyConfig)) {
                for (const rawRecord of pageResults) {
                    const parsedRecord = DeletedLeadSchema.safeParse(rawRecord);
                    if (parsedRecord.success) {
                        deletedLeads.push({ id: parsedRecord.data.id });
                    }
                }
            }

            if (deletedLeads.length > 0) {
                await nango.batchDelete(deletedLeads, 'Lead');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
