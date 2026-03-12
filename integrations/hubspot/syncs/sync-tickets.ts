import { createSync } from 'nango';
import { z } from 'zod';

const TicketSchema = z.object({
    id: z.string(),
    subject: z.union([z.string(), z.null()]),
    content: z.union([z.string(), z.null()]),
    owner_id: z.union([z.string(), z.null()]),
    pipeline: z.union([z.string(), z.null()]),
    stage: z.union([z.string(), z.null()]),
    category: z.union([z.string(), z.null()]),
    priority: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
});

const CheckpointSchema = z.object({
    after: z.string()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

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
        const checkpoint = (await nango.getCheckpoint()) as Checkpoint | null;
        let after = checkpoint?.after || undefined;

        while (true) {
            const response = await nango.get<{
                results?: any[];
                paging?: { next?: { after?: string } };
            }>({
                // https://developers.hubspot.com/docs/api-reference/crm-tickets-v3/guide
                endpoint: '/crm/v3/objects/tickets',
                params: {
                    properties: 'subject,content,hubspot_owner_id,hs_pipeline,hs_pipeline_stage,hs_category,hs_ticket_priority,createdate,hs_lastmodifieddate',
                    limit: '100',
                    ...(after && { after })
                },
                retries: 3
            });

            const records = (response.data.results ?? []).map((ticket) => ({
                id: ticket.id,
                subject: ticket.properties?.['subject'] ?? null,
                content: ticket.properties?.['content'] ?? null,
                owner_id: ticket.properties?.['hubspot_owner_id'] ?? null,
                pipeline: ticket.properties?.['hs_pipeline'] ?? null,
                stage: ticket.properties?.['hs_pipeline_stage'] ?? null,
                category: ticket.properties?.['hs_category'] ?? null,
                priority: ticket.properties?.['hs_ticket_priority'] ?? null,
                created_at: ticket.properties?.['createdate'] ?? null,
                updated_at: ticket.properties?.['hs_lastmodifieddate'] ?? null
            }));

            if (records.length === 0) {
                break;
            }

            await nango.batchSave(records, 'Ticket');

            const nextAfter = response.data.paging?.next?.after;
            if (nextAfter) {
                after = nextAfter;
                await nango.saveCheckpoint({
                    after
                });
                continue;
            }

            break;
        }

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
