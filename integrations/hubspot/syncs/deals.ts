import { createSync } from 'nango';
import { z } from 'zod';

const DealSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    amount: z.number().optional(),
    closeDate: z.string().optional(),
    stage: z.string().optional(),
    ownerId: z.string().optional(),
    description: z.string().optional(),
    companyIds: z.array(z.string()),
    contactIds: z.array(z.string()),
    updatedAt: z.string()
});

const AssociationResultSchema = z.object({
    results: z.array(z.object({ id: z.string() })).optional()
});

const HubspotDealApiSchema = z.object({
    id: z.string(),
    properties: z
        .object({
            dealname: z.string().nullish(),
            amount: z.string().nullish(),
            closedate: z.string().nullish(),
            dealstage: z.string().nullish(),
            hubspot_owner_id: z.string().nullish(),
            description: z.string().nullish(),
            hs_lastmodifieddate: z.string().nullish()
        })
        .nullish(),
    associations: z
        .object({
            companies: AssociationResultSchema.optional(),
            contacts: AssociationResultSchema.optional()
        })
        .partial()
        .optional(),
    updatedAt: z.string().nullish()
});

const DealResponseSchema = z.object({
    results: z.array(HubspotDealApiSchema).optional(),
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

type AssociationClient = {
    get: (config: { endpoint: string; retries: number }) => Promise<{ data: unknown }>;
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

async function fetchAssociatedIds(client: AssociationClient, dealId: string, association: 'companies' | 'contacts'): Promise<string[]> {
    // https://developers.hubspot.com/docs/reference/api/crm/associations/associations
    // @allowTryCatch Associations can be absent for a deal; treat that as an empty list.
    try {
        const response = await client.get({
            endpoint: `/crm/v3/objects/deals/${dealId}/associations/${association}`,
            retries: 3
        });

        return (AssociationResultSchema.parse(response.data).results || []).map((result) => result.id);
    } catch {
        return [];
    }
}

const sync = createSync({
    description: 'Sync deals with amount, close date, stage, owner, description, and associated companies and contacts',
    version: '3.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/deals', group: 'Deals' }],
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: HubspotCrmCheckpointSchema,

    models: {
        Deal: DealSchema
    },

    exec: async (nango) => {
        const checkpoint = parseHubspotCrmCheckpoint(await nango.getCheckpoint());
        const shouldUseInitialListSync = checkpoint?.phase !== 'incremental' || !checkpoint.updatedAfter;

        if (shouldUseInitialListSync) {
            let after = checkpoint?.after;
            let latestUpdatedAt = checkpoint?.updatedAfter;
            let hasMore = true;

            while (hasMore) {
                // https://developers.hubspot.com/docs/api-reference/crm-deals-v3/basic/get-crm-v3-objects-deals
                const response = await nango.get({
                    endpoint: '/crm/v3/objects/deals',
                    params: {
                        limit: '100',
                        properties: 'dealname,amount,closedate,dealstage,hubspot_owner_id,description,hs_lastmodifieddate',
                        associations: 'companies,contacts',
                        ...(after && { after })
                    },
                    retries: 3
                });

                const data = DealResponseSchema.parse(response.data);
                const deals = data.results || [];

                if (deals.length === 0) {
                    break;
                }

                const records = deals.map((deal) => ({
                    id: deal.id,
                    name: deal.properties?.['dealname'] ?? undefined,
                    amount: deal.properties?.['amount'] ? parseFloat(deal.properties['amount']) : undefined,
                    closeDate: deal.properties?.['closedate'] ?? undefined,
                    stage: deal.properties?.['dealstage'] ?? undefined,
                    ownerId: deal.properties?.['hubspot_owner_id'] ?? undefined,
                    description: deal.properties?.['description'] ?? undefined,
                    companyIds: (deal.associations?.companies?.results || []).map((association) => association.id),
                    contactIds: (deal.associations?.contacts?.results || []).map((association) => association.id),
                    updatedAt: deal.properties?.['hs_lastmodifieddate'] ?? deal.updatedAt ?? new Date().toISOString()
                }));

                await nango.batchSave(records, 'Deal');

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
                properties: ['dealname', 'amount', 'closedate', 'dealstage', 'hubspot_owner_id', 'description', 'hs_lastmodifieddate'],
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
                endpoint: '/crm/v3/objects/deals/search',
                data: searchBody,
                retries: 3
            });

            const data = DealResponseSchema.parse(response.data);
            const parsedBatch = data.results || [];

            if (parsedBatch.length === 0) {
                break;
            }

            const deals: z.infer<typeof DealSchema>[] = [];

            for (const deal of parsedBatch) {
                const companyIds = await fetchAssociatedIds(nango, deal.id, 'companies');
                const contactIds = await fetchAssociatedIds(nango, deal.id, 'contacts');

                deals.push({
                    id: deal.id,
                    name: deal.properties?.['dealname'] ?? undefined,
                    amount: deal.properties?.['amount'] ? parseFloat(deal.properties['amount']) : undefined,
                    closeDate: deal.properties?.['closedate'] ?? undefined,
                    stage: deal.properties?.['dealstage'] ?? undefined,
                    ownerId: deal.properties?.['hubspot_owner_id'] ?? undefined,
                    description: deal.properties?.['description'] ?? undefined,
                    companyIds,
                    contactIds,
                    updatedAt: deal.properties?.['hs_lastmodifieddate'] ?? deal.updatedAt ?? new Date().toISOString()
                });
            }

            await nango.batchSave(deals, 'Deal');

            latestUpdatedAt = deals.reduce((latest, deal) => updateLatestUpdatedAt(latest, deal.updatedAt), latestUpdatedAt);

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
