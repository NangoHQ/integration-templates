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

const CompanyApiSchema = z.object({
    id: z.string(),
    properties: z
        .object({
            name: z.string().nullish(),
            domain: z.string().nullish(),
            industry: z.string().nullish(),
            city: z.string().nullish(),
            state: z.string().nullish(),
            country: z.string().nullish(),
            phone: z.string().nullish(),
            website: z.string().nullish(),
            description: z.string().nullish(),
            createdate: z.string().nullish(),
            hs_lastmodifieddate: z.string().nullish()
        })
        .nullish(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish()
});

const CompanyResponseSchema = z.object({
    results: z.array(CompanyApiSchema).optional(),
    paging: z
        .object({
            next: z
                .object({
                    after: z.string()
                })
                .optional()
        })
        .optional()
});

const HubspotCrmCheckpointSchema = z.object({
    phase: z.string(),
    after: z.string(),
    updatedAfter: z.string()
});

type HubspotCrmCheckpoint = {
    phase: 'initial' | 'incremental';
    after?: string;
    updatedAfter?: string;
};

function parseHubspotCrmCheckpoint(value: unknown): HubspotCrmCheckpoint | undefined {
    const result = HubspotCrmCheckpointSchema.safeParse(value);
    if (!result.success) {
        return undefined;
    }

    const { phase, after, updatedAfter } = result.data;
    if (phase !== 'initial' && phase !== 'incremental') {
        return undefined;
    }

    const checkpoint: HubspotCrmCheckpoint = { phase };

    if (after) {
        checkpoint.after = after;
    }

    if (updatedAfter) {
        checkpoint.updatedAfter = updatedAfter;
    }

    return checkpoint;
}

function updateLatestUpdatedAt(current: string | undefined, candidate: string | null | undefined): string | undefined {
    if (!candidate) {
        return current;
    }

    return !current || candidate > current ? candidate : current;
}

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
    checkpoint: HubspotCrmCheckpointSchema,

    models: {
        Company: CompanySchema
    },

    exec: async (nango) => {
        const checkpoint = parseHubspotCrmCheckpoint(await nango.getCheckpoint());
        const shouldUseInitialListSync = checkpoint?.phase !== 'incremental' || !checkpoint.updatedAfter;

        if (shouldUseInitialListSync) {
            let after = checkpoint?.after;
            let latestUpdatedAt = checkpoint?.updatedAfter;
            let hasMore = true;

            while (hasMore) {
                // https://developers.hubspot.com/docs/api-reference/crm-companies-v3/basic/get-crm-v3-objects-companies
                const response = await nango.get({
                    endpoint: '/crm/v3/objects/companies',
                    params: {
                        limit: '100',
                        properties: 'name,domain,industry,city,state,country,phone,website,description,createdate,hs_lastmodifieddate',
                        ...(after && { after })
                    },
                    retries: 3
                });

                const data = CompanyResponseSchema.parse(response.data);
                const companies = data.results || [];

                if (companies.length === 0) {
                    break;
                }

                const records = companies.map((company) => {
                    const props = company.properties || {};

                    return {
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
                        createdAt: company.createdAt ?? props.createdate ?? undefined,
                        updatedAt: company.updatedAt ?? props.hs_lastmodifieddate ?? undefined
                    };
                });

                await nango.batchSave(records, 'Company');

                latestUpdatedAt = records.reduce((latest, record) => updateLatestUpdatedAt(latest, record.updatedAt), latestUpdatedAt);

                const nextAfter = data.paging?.next?.after;

                if (nextAfter) {
                    await nango.saveCheckpoint({
                        phase: 'initial',
                        after: nextAfter,
                        updatedAfter: latestUpdatedAt || ''
                    });
                    after = nextAfter;
                    continue;
                }

                if (latestUpdatedAt) {
                    await nango.saveCheckpoint({
                        phase: 'incremental',
                        after: '',
                        updatedAfter: latestUpdatedAt
                    });
                }

                hasMore = false;
            }

            return;
        }

        const updatedAfter = checkpoint.updatedAfter;
        let after = checkpoint.after;
        let latestUpdatedAt = updatedAfter;
        let hasMore = true;

        while (hasMore) {
            const searchBody: Record<string, unknown> = {
                limit: 100,
                properties: ['name', 'domain', 'industry', 'city', 'state', 'country', 'phone', 'website', 'description', 'createdate', 'hs_lastmodifieddate'],
                sorts: [
                    {
                        propertyName: 'hs_lastmodifieddate',
                        direction: 'ASCENDING'
                    }
                ],
                filterGroups: [
                    {
                        filters: [
                            {
                                propertyName: 'hs_lastmodifieddate',
                                operator: 'GT',
                                value: updatedAfter
                            }
                        ]
                    }
                ],
                ...(after && { after })
            };

            // Incremental syncs use search so they can filter by last modified date.
            // HubSpot search queries are capped at 10,000 total results; paging past that returns a 400 and can leave this incremental sync incomplete.
            // Template users should narrow the search window/filter strategy to fit their data volume before relying on this template.
            // https://developers.hubspot.com/docs/api-reference/search/guide#paging-through-results
            const response = await nango.post({
                endpoint: '/crm/v3/objects/companies/search',
                data: searchBody,
                retries: 3
            });

            const data = CompanyResponseSchema.parse(response.data);
            const companies = data.results || [];

            if (companies.length === 0) {
                break;
            }

            const records = companies.map((company) => {
                const props = company.properties || {};

                return {
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
                    createdAt: company.createdAt ?? props.createdate ?? undefined,
                    updatedAt: company.updatedAt ?? props.hs_lastmodifieddate ?? undefined
                };
            });

            await nango.batchSave(records, 'Company');

            latestUpdatedAt = records.reduce((latest, record) => updateLatestUpdatedAt(latest, record.updatedAt), latestUpdatedAt);

            const nextAfter = data.paging?.next?.after;

            if (nextAfter) {
                await nango.saveCheckpoint({
                    phase: 'incremental',
                    after: nextAfter,
                    updatedAfter: updatedAfter || ''
                });
                after = nextAfter;
                continue;
            }

            if (latestUpdatedAt) {
                await nango.saveCheckpoint({
                    phase: 'incremental',
                    after: '',
                    updatedAfter: latestUpdatedAt
                });
            }

            hasMore = false;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
