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

const CheckpointSchema = z.object({
    updatedAfter: z.string()
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
        .nullish()
});

function parseOptional<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
    const result = schema.safeParse(value);
    return result.success ? result.data : undefined;
}

const TicketSearchResponseSchema = z.object({
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

const sync = createSync({
    description: 'Sync service tickets with subject, content, owner, pipeline, stage, category, and priority',
    version: '1.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/sync-tickets', group: 'Tickets' }],
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,

    models: {
        Ticket: TicketSchema
    },

    exec: async (nango) => {
        const checkpoint = parseOptional(CheckpointSchema, await nango.getCheckpoint());

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
            ]
        };

        if (checkpoint?.updatedAfter) {
            searchBody['filterGroups'] = [
                {
                    filters: [
                        {
                            propertyName: 'hs_lastmodifieddate',
                            operator: 'GT',
                            value: checkpoint.updatedAfter
                        }
                    ]
                }
            ];
        }

        let after: string | undefined;

        do {
            if (after) {
                searchBody['after'] = after;
            } else {
                delete searchBody['after'];
            }

            // https://developers.hubspot.com/docs/api-reference/search/guide#paging-through-results
            const response = await nango.post({
                endpoint: '/crm/v3/objects/tickets/search',
                data: searchBody,
                retries: 3
            });

            const data = TicketSearchResponseSchema.parse(response.data);
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
                createdAt: ticket.properties?.['createdate'] ?? undefined,
                updatedAt: ticket.properties?.['hs_lastmodifieddate'] ?? undefined
            }));

            if (records.length === 0) {
                continue;
            }

            await nango.batchSave(records, 'Ticket');

            const lastRecord = records[records.length - 1];
            if (lastRecord && lastRecord.updatedAt) {
                await nango.saveCheckpoint({
                    updatedAfter: lastRecord.updatedAt
                });
            }

            after = data.paging?.next?.after;
        } while (after);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
