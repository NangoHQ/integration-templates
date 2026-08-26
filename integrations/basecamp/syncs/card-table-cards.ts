import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    pendingColumns: z.string().describe('JSON-encoded queue of remaining { projectId, columnId } pairs to crawl.')
});

const ColumnRefSchema = z.object({
    projectId: z.number(),
    columnId: z.number()
});

function parsePendingColumns(json: string): Array<z.infer<typeof ColumnRefSchema>> {
    return z.array(ColumnRefSchema).parse(JSON.parse(json));
}

const ColumnSchema = z.object({
    id: z.string().describe('The unique identifier of the column that contains the card.'),
    title: z.string().describe('The display name of the column.'),
    type: z.string().describe('The Basecamp type of the column, e.g. "Kanban::Triage".'),
    url: z.string().optional().describe('The API URL of the column.'),
    app_url: z.string().optional().describe('The Basecamp web app URL of the column.')
});

const BucketSchema = z.object({
    id: z.string().describe('The unique identifier of the project bucket that owns the card.'),
    name: z.string().describe('The name of the project bucket.'),
    type: z.string().describe('The Basecamp type of the bucket, e.g. "Project".')
});

const PersonSchema = z.object({
    id: z.string().describe('The unique identifier of the person.'),
    name: z.string().describe('The full name of the person.'),
    email_address: z.string().optional().describe('The email address of the person.'),
    title: z.string().optional().describe('The job title of the person.')
});

const CardTableCardSchema = z
    .object({
        id: z.string().describe('The unique identifier of the card table card.'),
        status: z.string().describe('The status of the card, e.g. "active" or "drafted".'),
        visible_to_clients: z.boolean().describe('Whether the card is visible to client users.'),
        created_at: z.string().describe('The ISO 8601 timestamp when the card was created.'),
        updated_at: z.string().describe('The ISO 8601 timestamp when the card was last updated.'),
        title: z.string().describe('The title of the card.'),
        type: z.string().describe('The Basecamp type of the card, e.g. "Kanban::Card".'),
        url: z.string().describe('The API URL of the card.'),
        app_url: z.string().describe('The Basecamp web app URL of the card.'),
        position: z.number().describe('The 1-indexed position of the card within its column.'),
        parent: ColumnSchema.describe('The column that contains this card.'),
        bucket: BucketSchema.describe('The project bucket that owns this card.'),
        creator: PersonSchema.describe('The person who created this card.'),
        description: z.string().optional().describe('The rich-text description of the card.'),
        content: z.string().optional().describe('The plain-text content of the card.'),
        completed: z.boolean().describe('Whether the card is marked as completed.'),
        due_on: z.string().optional().describe('The due date of the card in ISO 8601 format, if any.'),
        assignees: z.array(PersonSchema).describe('The people assigned to this card.'),
        comment_count: z.number().describe('The number of comments on this card.'),
        comments_url: z.string().describe("The API URL for the card's comments.")
    })
    .describe('A card table card (Kanban card) in Basecamp.');

const ProviderDockToolSchema = z.object({
    id: z.number(),
    name: z.string(),
    enabled: z.boolean(),
    position: z.number().nullable().optional(),
    url: z.string().optional(),
    app_url: z.string().optional(),
    title: z.string().optional()
});

const ProviderProjectSchema = z.object({
    id: z.number(),
    name: z.string(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    dock: z.array(ProviderDockToolSchema).optional()
});

const ProviderCardTableSchema = z.object({
    id: z.number(),
    status: z.string(),
    lists: z
        .array(
            z.object({
                id: z.number(),
                title: z.string(),
                type: z.string(),
                url: z.string().optional(),
                app_url: z.string().optional()
            })
        )
        .optional()
});

const ProviderPersonSchema = z.object({
    id: z.number(),
    name: z.string(),
    email_address: z.string().optional(),
    title: z.string().nullable().optional()
});

const ProviderCardSchema = z.object({
    id: z.number(),
    status: z.string(),
    visible_to_clients: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    title: z.string(),
    type: z.string(),
    url: z.string(),
    app_url: z.string(),
    position: z.number(),
    parent: z.object({
        id: z.number(),
        title: z.string(),
        type: z.string(),
        url: z.string().optional(),
        app_url: z.string().optional()
    }),
    bucket: z.object({
        id: z.number(),
        name: z.string(),
        type: z.string()
    }),
    creator: ProviderPersonSchema,
    description: z.string().optional(),
    content: z.string().nullable().optional(),
    completed: z.boolean(),
    due_on: z.string().nullable().optional(),
    assignees: z.array(ProviderPersonSchema).optional(),
    comments_count: z.number().optional(),
    comments_url: z.string().optional()
});

const sync = createSync({
    description: "Sync Kanban cards across all known projects' Card Tables.",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CardTableCard: CardTableCardSchema
    },

    exec: async (nango) => {
        async function discoverColumns(): Promise<Array<z.infer<typeof ColumnRefSchema>>> {
            const projects: z.infer<typeof ProviderProjectSchema>[] = [];

            const projectsConfig: ProxyConfiguration = {
                // https://github.com/basecamp/bc3-api/blob/master/sections/projects.md#get-projects
                endpoint: '/projects.json',
                paginate: {
                    type: 'link',
                    link_rel_in_response_header: 'next',
                    limit: 100,
                    limit_name_in_request: 'limit'
                },
                retries: 3
            };

            for await (const batch of nango.paginate(projectsConfig)) {
                for (const raw of batch) {
                    const project = ProviderProjectSchema.parse(raw);
                    projects.push(project);
                }
            }

            const cardTables: { projectId: number; cardTableId: number }[] = [];
            for (const project of projects) {
                const kanbanTool = project.dock?.find((tool) => tool.name === 'kanban_board' && tool.enabled);
                if (kanbanTool) {
                    cardTables.push({ projectId: project.id, cardTableId: kanbanTool.id });
                }
            }

            const columns: Array<z.infer<typeof ColumnRefSchema>> = [];
            for (const { projectId, cardTableId } of cardTables) {
                // https://github.com/basecamp/bc3-api/blob/master/sections/card_tables.md#get-a-card-table
                const cardTableResponse = await nango.get({
                    endpoint: `/buckets/${encodeURIComponent(projectId)}/card_tables/${encodeURIComponent(cardTableId)}.json`,
                    retries: 3
                });

                const cardTable = ProviderCardTableSchema.parse(cardTableResponse.data);
                for (const column of cardTable.lists ?? []) {
                    columns.push({ projectId, columnId: column.id });
                }
            }

            return columns;
        }

        const checkpoint = await nango.getCheckpoint();
        let queue: Array<z.infer<typeof ColumnRefSchema>>;

        if (checkpoint != null && typeof checkpoint['pendingColumns'] === 'string') {
            queue = parsePendingColumns(checkpoint['pendingColumns']);
            // A checkpoint restored with an empty queue is indistinguishable from a prior
            // execution that crashed right after persisting its final (empty) checkpoint but
            // before trackDeletesEnd ran. Treat it as untrustworthy and rediscover from scratch
            // rather than let an empty queue silently close out delete tracking below.
            if (queue.length === 0) {
                queue = await discoverColumns();
            }
        } else {
            queue = await discoverColumns();
        }

        // If there is still nothing to crawl (no projects with an enabled Card Table), skip
        // delete tracking entirely instead of opening and immediately closing an empty window,
        // which would delete every previously synced CardTableCard.
        if (queue.length === 0) {
            await nango.clearCheckpoint();
            return;
        }

        await nango.trackDeletesStart('CardTableCard');

        while (queue.length > 0) {
            const next = queue.shift();
            if (!next) {
                continue;
            }

            const cardsConfig: ProxyConfiguration = {
                // https://github.com/basecamp/bc3-api/blob/master/sections/card_table_cards.md#get-cards-in-a-column
                endpoint: `/buckets/${encodeURIComponent(next.projectId)}/card_tables/lists/${encodeURIComponent(next.columnId)}/cards.json`,
                paginate: {
                    type: 'link',
                    link_rel_in_response_header: 'next',
                    limit: 100,
                    limit_name_in_request: 'limit'
                },
                retries: 3
            };

            for await (const batch of nango.paginate(cardsConfig)) {
                const cards = batch.map((raw) => {
                    const card = ProviderCardSchema.parse(raw);

                    return {
                        id: String(card.id),
                        status: card.status,
                        visible_to_clients: card.visible_to_clients,
                        created_at: card.created_at,
                        updated_at: card.updated_at,
                        title: card.title,
                        type: card.type,
                        url: card.url,
                        app_url: card.app_url,
                        position: card.position,
                        parent: {
                            id: String(card.parent.id),
                            title: card.parent.title,
                            type: card.parent.type,
                            url: card.parent.url,
                            app_url: card.parent.app_url
                        },
                        bucket: {
                            id: String(card.bucket.id),
                            name: card.bucket.name,
                            type: card.bucket.type
                        },
                        creator: {
                            id: String(card.creator.id),
                            name: card.creator.name,
                            email_address: card.creator.email_address,
                            title: card.creator.title ?? undefined
                        },
                        description: card.description ?? undefined,
                        content: card.content ?? undefined,
                        completed: card.completed,
                        due_on: card.due_on ?? undefined,
                        assignees: (card.assignees ?? []).map((a) => ({
                            id: String(a.id),
                            name: a.name,
                            email_address: a.email_address,
                            title: a.title ?? undefined
                        })),
                        comment_count: card.comments_count ?? 0,
                        comments_url: card.comments_url ?? ''
                    };
                });

                if (cards.length > 0) {
                    await nango.batchSave(cards, 'CardTableCard');
                }
            }

            if (queue.length > 0) {
                await nango.saveCheckpoint({ pendingColumns: JSON.stringify(queue) });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('CardTableCard');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
