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
    updatedAfter: z.string(),
    // Tie-breaker record id for the `updatedAfter` timestamp; lets the search filter make
    // guaranteed progress through records that share a timestamp (see buildIncrementalFilterGroups).
    updatedAfterId: z.string(),
    windowCount: z.number()
});

type HubspotCrmCheckpoint = {
    phase: 'initial' | 'incremental';
    after?: string;
    updatedAfter?: string;
    updatedAfterId?: string;
    windowCount: number;
};

type AssociationClient = {
    get: (config: { endpoint: string; retries: number }) => Promise<{ data: unknown }>;
};

function parseHubspotCrmCheckpoint(value: unknown): HubspotCrmCheckpoint | undefined {
    // `windowCount` and `updatedAfterId` were added after this sync first shipped. Default them
    // when absent so a checkpoint saved by an earlier version still resumes incrementally instead
    // of failing validation and forcing a full resync.
    const withDefaults = value && typeof value === 'object' ? { windowCount: 0, updatedAfterId: '', ...value } : value;
    const result = HubspotCrmCheckpointSchema.safeParse(withDefaults);
    if (!result.success) {
        return undefined;
    }

    const { phase, after, updatedAfter, updatedAfterId, windowCount } = result.data;
    if (phase !== 'initial' && phase !== 'incremental') {
        return undefined;
    }

    const checkpoint: HubspotCrmCheckpoint = { phase, windowCount };

    if (after) {
        checkpoint.after = after;
    }

    if (updatedAfter) {
        checkpoint.updatedAfter = updatedAfter;
    }

    if (updatedAfterId) {
        checkpoint.updatedAfterId = updatedAfterId;
    }

    return checkpoint;
}

// Builds filters equivalent to `hs_lastmodifieddate > floor OR (hs_lastmodifieddate = floor AND
// hs_object_id > floorId)`. Plain `GT`/`GTE` on the timestamp alone cannot both avoid data loss and
// guarantee progress once more records than fit in a search window share the same timestamp: GT
// permanently skips unseen ties, and GTE re-issues an identical query forever if the tied group
// itself exceeds the window. The timestamp+id composite key strictly increases every page.
function buildIncrementalFilterGroups(floor: string, floorId: string): Record<string, unknown>[] {
    const filterGroups: Record<string, unknown>[] = [
        {
            filters: [
                {
                    propertyName: 'hs_lastmodifieddate',
                    operator: 'GT',
                    value: floor
                }
            ]
        }
    ];

    if (floorId) {
        filterGroups.push({
            filters: [
                {
                    propertyName: 'hs_lastmodifieddate',
                    operator: 'EQ',
                    value: floor
                },
                {
                    propertyName: 'hs_object_id',
                    operator: 'GT',
                    value: floorId
                }
            ]
        });
    }

    return filterGroups;
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
    version: '3.0.3',
    endpoints: [{ method: 'GET', path: '/syncs/deals', group: 'Deals' }],
    frequency: 'every hour',
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
                        updatedAfter: latestUpdatedAt || '',
                        updatedAfterId: '',
                        windowCount: 0
                    });
                    after = nextAfter;
                    continue;
                }

                if (latestUpdatedAt) {
                    await nango.saveCheckpoint({
                        phase: 'incremental',
                        after: '',
                        updatedAfter: latestUpdatedAt,
                        updatedAfterId: '',
                        windowCount: 0
                    });
                }

                hasMore = false;
            }

            return;
        }

        // HubSpot search queries can only page through 10,000 total results; paging past that
        // returns a 400. Once a search window approaches the cap, advance the window's lower
        // bound to the latest modification time (and record) seen so far and resume paging from
        // there, which partitions the incremental run into bounded sub-windows instead of ever
        // hitting the cap. The window count is persisted in the checkpoint since a run can be
        // interrupted and resumed mid-window, at which point the in-memory count alone would be lost.
        // https://developers.hubspot.com/docs/api-reference/search/guide#paging-through-results
        const SEARCH_WINDOW_RESULT_LIMIT = 9900;

        let windowFloor = checkpoint.updatedAfter;
        let windowFloorId = checkpoint.updatedAfterId || '';
        let after = checkpoint.after;
        let latestUpdatedAt = windowFloor;
        let latestId = windowFloorId;
        let resultsInWindow = checkpoint.windowCount;
        let hasMore = true;

        while (hasMore) {
            const searchBody: Record<string, unknown> = {
                limit: 100,
                properties: ['dealname', 'amount', 'closedate', 'dealstage', 'hubspot_owner_id', 'description', 'hs_lastmodifieddate'],
                sorts: [
                    {
                        propertyName: 'hs_lastmodifieddate',
                        direction: 'ASCENDING'
                    },
                    {
                        propertyName: 'hs_object_id',
                        direction: 'ASCENDING'
                    }
                ],
                filterGroups: buildIncrementalFilterGroups(windowFloor || '', windowFloorId),
                ...(after && { after })
            };

            // Incremental syncs use search so they can filter by last modified date.
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

            // Sorted ascending by (hs_lastmodifieddate, hs_object_id), so the last item in the
            // page holds the maximum composite key seen so far.
            const lastItem = parsedBatch[parsedBatch.length - 1]!;
            const lastItemTimestamp = lastItem.properties?.['hs_lastmodifieddate'];

            if (lastItemTimestamp) {
                latestUpdatedAt = lastItemTimestamp;
                latestId = lastItem.id;
            }

            resultsInWindow += parsedBatch.length;

            const nextAfter = data.paging?.next?.after;
            const madeProgress = latestUpdatedAt !== windowFloor || latestId !== windowFloorId;

            if (nextAfter && resultsInWindow >= SEARCH_WINDOW_RESULT_LIMIT) {
                if (!madeProgress) {
                    // Defensive backstop: the composite (timestamp, id) filter should always make
                    // progress once it carries a tie-breaker id. Stop instead of re-issuing an
                    // identical query forever if that invariant is ever violated.
                    await nango.log('Incremental deals sync made no progress advancing the search window; stopping to avoid an infinite loop', {
                        windowFloor: windowFloor || '',
                        windowFloorId
                    });
                    break;
                }

                windowFloor = latestUpdatedAt || windowFloor;
                windowFloorId = latestId || '';
                after = '';
                resultsInWindow = 0;
                await nango.saveCheckpoint({
                    phase: 'incremental',
                    after: '',
                    updatedAfter: windowFloor || '',
                    updatedAfterId: windowFloorId,
                    windowCount: 0
                });
                continue;
            }

            if (nextAfter) {
                await nango.saveCheckpoint({
                    phase: 'incremental',
                    after: nextAfter,
                    updatedAfter: windowFloor || '',
                    updatedAfterId: windowFloorId,
                    windowCount: resultsInWindow
                });
                after = nextAfter;
                continue;
            }

            if (latestUpdatedAt) {
                await nango.saveCheckpoint({
                    phase: 'incremental',
                    after: '',
                    updatedAfter: latestUpdatedAt,
                    updatedAfterId: latestId || '',
                    windowCount: 0
                });
            }

            hasMore = false;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
