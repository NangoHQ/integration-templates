import { createSync } from 'nango';
import { z } from 'zod';

const CompanySchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    domain: z.union([z.string(), z.null()]),
    industry: z.union([z.string(), z.null()]),
    city: z.union([z.string(), z.null()]),
    state: z.union([z.string(), z.null()]),
    country: z.union([z.string(), z.null()]),
    phone: z.union([z.string(), z.null()]),
    website: z.union([z.string(), z.null()]),
    description: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync companies from HubSpot CRM',
    version: '1.0.0',
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/sync-companies',
            group: 'Companies'
        }
    ],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,

    models: {
        Company: CompanySchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        // Use HubSpot search API to filter by last modified date for incremental sync
        // https://developers.hubspot.com/docs/api/crm/search
        const searchBody: any = {
            limit: 100,
            properties: ['name', 'domain', 'industry', 'city', 'state', 'country', 'phone', 'website', 'description', 'createdate', 'hs_lastmodifieddate'],
            sorts: [
                {
                    propertyName: 'hs_lastmodifieddate',
                    direction: 'ASCENDING'
                }
            ]
        };

        // If we have a checkpoint, filter to only get records modified since then
        if (checkpoint?.['updated_after']) {
            searchBody.filterGroups = [
                {
                    filters: [
                        {
                            propertyName: 'hs_lastmodifieddate',
                            operator: 'GT',
                            value: checkpoint['updated_after']
                        }
                    ]
                }
            ];
        }

        let after: string | undefined;
        let latestUpdatedAt: string | undefined;

        do {
            if (after) {
                searchBody.after = after;
            }

            const response = await nango.post({
                endpoint: '/crm/v3/objects/companies/search',
                data: searchBody,
                retries: 3
            });

            const companies = response.data.results || [];

            if (companies.length === 0) {
                break;
            }

            const records = companies.map((company: any) => {
                const props = company.properties || {};
                const record = {
                    id: company.id,
                    name: props.name ?? null,
                    domain: props.domain ?? null,
                    industry: props.industry ?? null,
                    city: props.city ?? null,
                    state: props.state ?? null,
                    country: props.country ?? null,
                    phone: props.phone ?? null,
                    website: props.website ?? null,
                    description: props.description ?? null,
                    created_at: props.createdate ?? null,
                    updated_at: props.hs_lastmodifieddate ?? null
                };

                // Track the latest updated_at for checkpoint
                if (props.hs_lastmodifieddate) {
                    if (!latestUpdatedAt || props.hs_lastmodifieddate > latestUpdatedAt) {
                        latestUpdatedAt = props.hs_lastmodifieddate;
                    }
                }

                return record;
            });

            await nango.batchSave(records, 'Company');

            // Get next page cursor
            after = response.data.paging?.next?.after;

            // Save checkpoint after each batch
            if (latestUpdatedAt) {
                await nango.saveCheckpoint({
                    updated_after: latestUpdatedAt
                });
            }
        } while (after);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
