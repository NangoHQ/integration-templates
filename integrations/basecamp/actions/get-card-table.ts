import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the Basecamp project containing the card table. Example: 48644099'),
        cardTableId: z.number().describe('The ID of the card table (Kanban board) to retrieve. Example: 10239340943')
    })
    .describe('Input for retrieving a Basecamp card table.');

const BucketSchema = z
    .object({
        id: z.number().describe('Project ID.'),
        name: z.string().describe('Project name.'),
        type: z.string().describe('Resource type, typically "Project".')
    })
    .describe('The project that owns this card table.');

const ColumnSchema = z
    .object({
        id: z.number().describe('Column ID.'),
        title: z.string().describe('Column title.'),
        type: z.string().describe('Column type, e.g. "Kanban::Triage", "Kanban::Column", "Kanban::DoneColumn".'),
        status: z.string().describe('Column status, e.g. "active".'),
        position: z.number().optional().describe('Zero-based position within the card table, if applicable.'),
        cards_count: z.number().describe('Number of cards in this column.'),
        cards_url: z.string().describe('URL to fetch the cards in this column.'),
        color: z.string().nullable().optional().describe('Column color, if set.')
    })
    .describe('A column within a Basecamp card table.');

const OutputSchema = z
    .object({
        id: z.number().describe('Card table ID.'),
        status: z.string().describe('Card table status, e.g. "active".'),
        title: z.string().describe('Card table title.'),
        type: z.string().describe('Resource type, typically "Kanban::Board".'),
        url: z.string().describe('API URL for this card table.'),
        app_url: z.string().describe('Web app URL for this card table.'),
        created_at: z.string().describe('ISO 8601 creation timestamp.'),
        updated_at: z.string().describe('ISO 8601 last-update timestamp.'),
        position: z.number().describe('Position of the card table in the project dock.'),
        bucket: BucketSchema.describe('The project this card table belongs to.'),
        lists: z.array(ColumnSchema).describe('Columns in the card table, including built-in and custom columns.')
    })
    .describe('A Basecamp card table (Kanban board) including its columns.');

/**
 * @tags: [read]
 * @tagReason: Reads the card table and its columns from the Basecamp API.
 * @pitfalls: The card table must be enabled in the project dock; a not_found error can also indicate insufficient permissions or an inactive account.
 */
const action = createAction({
    description: 'Get a Basecamp card table (Kanban board) including its columns.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://github.com/basecamp/bc3-api/blob/master/sections/card_tables.md#get-a-card-table
        const response = await nango.get({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/card_tables/${encodeURIComponent(input.cardTableId)}.json`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Card table not found.',
                projectId: input.projectId,
                cardTableId: input.cardTableId
            });
        }

        const providerCardTable = z
            .object({
                id: z.number(),
                status: z.string(),
                title: z.string(),
                type: z.string(),
                url: z.string(),
                app_url: z.string(),
                created_at: z.string(),
                updated_at: z.string(),
                position: z.number(),
                bucket: z.object({
                    id: z.number(),
                    name: z.string(),
                    type: z.string()
                }),
                lists: z.array(
                    z.object({
                        id: z.number(),
                        title: z.string(),
                        type: z.string(),
                        status: z.string(),
                        position: z.number().optional(),
                        cards_count: z.number(),
                        cards_url: z.string(),
                        color: z.string().nullable().optional()
                    })
                )
            })
            .parse(response.data);

        return {
            id: providerCardTable.id,
            status: providerCardTable.status,
            title: providerCardTable.title,
            type: providerCardTable.type,
            url: providerCardTable.url,
            app_url: providerCardTable.app_url,
            created_at: providerCardTable.created_at,
            updated_at: providerCardTable.updated_at,
            position: providerCardTable.position,
            bucket: providerCardTable.bucket,
            lists: providerCardTable.lists.map((list) => ({
                id: list.id,
                title: list.title,
                type: list.type,
                status: list.status,
                ...(list.position !== undefined && { position: list.position }),
                cards_count: list.cards_count,
                cards_url: list.cards_url,
                ...(list.color !== undefined && list.color !== null && { color: list.color })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
