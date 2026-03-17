import { createSync } from 'nango';
import { z } from 'zod';

const CompanySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    domain: z.string().optional(),
    industry: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    description: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const CheckpointSchema = z.object({
    updatedAfter: z.string()
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
        if (checkpoint?.['updatedAfter']) {
            searchBody.filterGroups = [
                {
                    filters: [
                        {
                            propertyName: 'hs_lastmodifieddate',
                            operator: 'GT',
                            value: checkpoint['updatedAfter']
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
                    name: props.name ?? undefined,
                    domain: props.domain ?? undefined,
                    industry: props.industry ?? undefined,
                    city: props.city ?? undefined,
                    state: props.state ?? undefined,
                    country: props.country ?? undefined,
                    phone: props.phone ?? undefined,
                    website: props.website ?? undefined,
                    description: props.description ?? undefined,
                    createdAt: props.createdate ?? undefined,
                    updatedAt: props['hs_lastmodifieddate'] ?? undefined
                };

                // Track the latest updated_at for checkpoint
                if (props['hs_lastmodifieddate']) {
                    if (!latestUpdatedAt || props['hs_lastmodifieddate'] > latestUpdatedAt) {
                        latestUpdatedAt = props['hs_lastmodifieddate'];
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
                    updatedAfter: latestUpdatedAt
                });
            }
        } while (after);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
