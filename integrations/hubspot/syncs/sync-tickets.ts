import { createSync } from 'nango';
import { z } from 'zod';

const TicketSchema = z.object({
    id: z.string(),
    subject: z.string().optional(),
    content: z.string().optional(),
    ownerId: z.string().optional(),
    pipeline: z.string().optional(),
    stage: z.string().optional(),
    category: z.string().optional(),
    priority: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const TicketApiSchema = z.object({
    id: z.string(),
    properties: z
        .object({
            subject: z.string().nullish(),
            content: z.string().nullish(),
            hubspot_owner_id: z.string().nullish(),
            hs_pipeline: z.string().nullish(),
            hs_pipeline_stage: z.string().nullish(),
            hs_category: z.string().nullish(),
            hs_ticket_priority: z.string().nullish(),
            createdate: z.string().nullish(),
            hs_lastmodifieddate: z.string().nullish()
        })
        .nullish(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish()
});

const TicketResponseSchema = z.object({
    results: z.array(TicketApiSchema).optional(),
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
    description: 'Sync service tickets with subject, content, owner, pipeline, stage, category, and priority',
    version: '1.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/sync-tickets', group: 'Tickets' }],
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: HubspotCrmCheckpointSchema,

    models: {
        Ticket: TicketSchema
    },

    exec: async (nango) => {
        const checkpoint = parseHubspotCrmCheckpoint(await nango.getCheckpoint());
        const shouldUseInitialListSync = checkpoint?.phase !== 'incremental' || !checkpoint.updatedAfter;

        if (shouldUseInitialListSync) {
            let after = checkpoint?.after;
            let latestUpdatedAt = checkpoint?.updatedAfter;
            let hasMore = true;

            while (hasMore) {
                // https://developers.hubspot.com/docs/api-reference/crm-tickets-v3/basic/get-crm-v3-objects-tickets
                const response = await nango.get({
                    endpoint: '/crm/v3/objects/tickets',
                    params: {
                        limit: '100',
                        properties:
                            'subject,content,hubspot_owner_id,hs_pipeline,hs_pipeline_stage,hs_category,hs_ticket_priority,createdate,hs_lastmodifieddate',
                        ...(after && { after })
                    },
                    retries: 3
                });

                const data = TicketResponseSchema.parse(response.data);
                const tickets = data.results || [];

                if (tickets.length === 0) {
                    break;
                }

                const records = tickets.map((ticket) => ({
                    id: ticket.id,
                    subject: ticket.properties?.['subject'] ?? undefined,
                    content: ticket.properties?.['content'] ?? undefined,
                    ownerId: ticket.properties?.['hubspot_owner_id'] ?? undefined,
                    pipeline: ticket.properties?.['hs_pipeline'] ?? undefined,
                    stage: ticket.properties?.['hs_pipeline_stage'] ?? undefined,
                    category: ticket.properties?.['hs_category'] ?? undefined,
                    priority: ticket.properties?.['hs_ticket_priority'] ?? undefined,
                    createdAt: ticket.createdAt ?? ticket.properties?.['createdate'] ?? undefined,
                    updatedAt: ticket.updatedAt ?? ticket.properties?.['hs_lastmodifieddate'] ?? undefined
                }));

                await nango.batchSave(records, 'Ticket');

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
                properties: [
                    'subject',
                    'content',
                    'hubspot_owner_id',
                    'hs_pipeline',
                    'hs_pipeline_stage',
                    'hs_category',
                    'hs_ticket_priority',
                    'createdate',
                    'hs_lastmodifieddate'
                ],
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
                endpoint: '/crm/v3/objects/tickets/search',
                data: searchBody,
                retries: 3
            });

            const data = TicketResponseSchema.parse(response.data);
            const tickets = data.results || [];

            if (tickets.length === 0) {
                break;
            }

            const records = tickets.map((ticket) => ({
                id: ticket.id,
                subject: ticket.properties?.['subject'] ?? undefined,
                content: ticket.properties?.['content'] ?? undefined,
                ownerId: ticket.properties?.['hubspot_owner_id'] ?? undefined,
                pipeline: ticket.properties?.['hs_pipeline'] ?? undefined,
                stage: ticket.properties?.['hs_pipeline_stage'] ?? undefined,
                category: ticket.properties?.['hs_category'] ?? undefined,
                priority: ticket.properties?.['hs_ticket_priority'] ?? undefined,
                createdAt: ticket.createdAt ?? ticket.properties?.['createdate'] ?? undefined,
                updatedAt: ticket.updatedAt ?? ticket.properties?.['hs_lastmodifieddate'] ?? undefined
            }));

            await nango.batchSave(records, 'Ticket');

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
