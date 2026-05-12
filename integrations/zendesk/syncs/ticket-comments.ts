import { createSync } from 'nango';
import { z } from 'zod';

// https://developer.zendesk.com/api-reference/ticketing/tickets/ticket_comments/
const TicketCommentSchema = z.object({
    id: z.number(),
    type: z.string().optional(),
    author_id: z.number(),
    body: z.string().optional(),
    html_body: z.string().optional(),
    plain_body: z.string().optional(),
    public: z.boolean().optional(),
    attachments: z.array(z.unknown()).optional(),
    via: z.unknown().optional(),
    created_at: z.string(),
    updated_at: z.string().optional(),
    metadata: z.unknown().optional()
});

// https://developer.zendesk.com/api-reference/ticketing/tickets/ticket_comments/#response-format
const TicketCommentsResponseSchema = z.object({
    comments: z.array(TicketCommentSchema),
    next_page: z.string().nullable().optional(),
    prev_page: z.string().nullable().optional(),
    count: z.number().optional()
});

const TicketCommentRecordSchema = z.object({
    id: z.string(),
    ticket_id: z.string(),
    type: z.string().optional(),
    author_id: z.string(),
    body: z.string().optional(),
    html_body: z.string().optional(),
    plain_body: z.string().optional(),
    public: z.boolean().optional(),
    created_at: z.string(),
    updated_at: z.string().optional()
});

const CheckpointSchema = z.object({
    ticket_id: z.number(),
    page: z.number()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

const sync = createSync({
    description: 'Sync comments for tickets in scope',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'POST', path: '/syncs/ticket-comments' }],
    checkpoint: CheckpointSchema,
    models: {
        TicketComment: TicketCommentRecordSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const currentCheckpoint: Checkpoint = checkpoint ?? { ticket_id: 0, page: 1 };

        // Get parent sync state - ticket IDs to process
        const parentMetadata = await nango.getMetadata<{
            ticket_ids?: number[];
        }>();

        const ticketIds = parentMetadata?.ticket_ids;

        if (!ticketIds || ticketIds.length === 0) {
            await nango.clearCheckpoint();
            await nango.log('No ticket IDs provided in metadata - skipping sync');
            return;
        }

        // Sort ticket IDs to ensure consistent ordering
        const sortedTicketIds = [...ticketIds].sort((a, b) => a - b);

        // Resume from checkpoint if available
        let startIndex = 0;
        let startPage = 1;

        if (currentCheckpoint.ticket_id > 0) {
            const resumeIndex = sortedTicketIds.indexOf(currentCheckpoint.ticket_id);
            if (resumeIndex !== -1) {
                startIndex = resumeIndex;
                startPage = currentCheckpoint.page;
            }
        }

        for (let i = startIndex; i < sortedTicketIds.length; i = i + 1) {
            const ticketId = sortedTicketIds[i];

            if (ticketId === undefined) {
                continue;
            }

            let page = i === startIndex ? startPage : 1;
            let hasMorePages = true;

            await nango.log(`Processing comments for ticket ${ticketId}`);

            while (hasMorePages) {
                // https://developer.zendesk.com/api-reference/ticketing/tickets/ticket_comments/#list-comments
                const response = await nango.get({
                    endpoint: `/api/v2/tickets/${encodeURIComponent(ticketId)}/comments`,
                    params: {
                        page: String(page)
                    },
                    retries: 3
                });

                const parsed = TicketCommentsResponseSchema.safeParse(response.data);

                if (!parsed.success) {
                    throw new Error(`Failed to parse ticket comments response for ticket ${ticketId}: ${parsed.error.message}`);
                }

                const { comments, next_page } = parsed.data;

                if (comments.length > 0) {
                    const records = comments.map((comment) => ({
                        id: String(comment.id),
                        ticket_id: String(ticketId),
                        ...(comment.type != null && { type: comment.type }),
                        author_id: String(comment.author_id),
                        ...(comment.body != null && { body: comment.body }),
                        ...(comment.html_body != null && { html_body: comment.html_body }),
                        ...(comment.plain_body != null && { plain_body: comment.plain_body }),
                        ...(comment.public != null && { public: comment.public }),
                        created_at: comment.created_at,
                        ...(comment.updated_at != null && { updated_at: comment.updated_at })
                    }));

                    await nango.batchSave(records, 'TicketComment');
                }

                // Check if there are more pages
                hasMorePages = next_page != null;

                if (hasMorePages) {
                    page = page + 1;

                    // Save checkpoint after each page for resume capability
                    const nextCheckpoint: Checkpoint = {
                        ticket_id: ticketId,
                        page
                    };
                    await nango.saveCheckpoint(nextCheckpoint);
                }
            }

            // Save checkpoint after completing a ticket
            const nextTicketId = sortedTicketIds[i + 1];
            if (nextTicketId !== undefined) {
                const ticketCheckpoint: Checkpoint = {
                    ticket_id: nextTicketId,
                    page: 1
                };
                await nango.saveCheckpoint(ticketCheckpoint);
            }
        }

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
