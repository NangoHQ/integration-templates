import { z } from 'zod';
import { createAction } from 'nango';

function parseLinkHeader(linkHeader: string | undefined): Record<string, string> {
    const result: Record<string, string> = {};
    if (!linkHeader) {
        return result;
    }
    const parts = linkHeader.split(',');
    for (const part of parts) {
        const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
        if (match && match[1] && match[2]) {
            result[match[2]] = match[1];
        }
    }
    return result;
}

const InputSchema = z
    .object({
        projectId: z.string().describe('The project ID (bucket ID).'),
        columnId: z.string().describe('The card table column ID.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
    })
    .describe('Input for listing cards in a Card Table column.');

const CardSchema = z
    .object({
        id: z.number().describe('Unique identifier for the card.'),
        status: z.string().describe('Status of the card.'),
        visible_to_clients: z.boolean().optional().describe('Whether the card is visible to clients.'),
        created_at: z.string().describe('ISO 8601 timestamp when the card was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the card was last updated.'),
        title: z.string().describe('Title of the card.'),
        inherits_status: z.boolean().optional().describe('Whether the card inherits status from its parent.'),
        type: z.string().describe('Type of the record, typically "Kanban::Card".'),
        url: z.string().describe('API URL for the card.'),
        app_url: z.string().describe('App URL for the card.'),
        bookmark_url: z.string().optional().describe('Bookmark URL for the card.'),
        subscription_url: z.string().optional().describe('Subscription URL for the card.'),
        comments_count: z.number().optional().describe('Number of comments on the card.'),
        comments_url: z.string().optional().describe('URL to fetch comments for the card.'),
        boosts_count: z.number().optional().describe('Number of boosts on the card.'),
        boosts_url: z.string().optional().describe('URL to fetch boosts for the card.'),
        position: z.number().describe('Position of the card in the column.'),
        parent: z
            .object({
                id: z.number().describe('ID of the parent column.'),
                title: z.string().describe('Title of the parent column.'),
                type: z.string().describe('Type of the parent record.')
            })
            .optional()
            .describe('The parent column containing this card.'),
        bucket: z
            .object({
                id: z.number().describe('ID of the project (bucket).'),
                name: z.string().describe('Name of the project.'),
                type: z.string().describe('Type of the bucket, typically "Project".')
            })
            .optional()
            .describe('The project this card belongs to.'),
        creator: z
            .object({
                id: z.number().describe('ID of the creator.'),
                name: z.string().describe('Name of the creator.'),
                email_address: z.string().optional().describe('Email address of the creator.')
            })
            .optional()
            .describe('The person who created this card.'),
        description: z.string().optional().describe('Description of the card.'),
        description_attachments: z.array(z.unknown()).optional().describe('Attachments in the description.'),
        completed: z.boolean().describe('Whether the card is completed.'),
        content: z.string().nullable().optional().describe('Content of the card.'),
        due_on: z.string().nullable().optional().describe('Due date of the card in ISO 8601 format.'),
        assignees: z
            .array(
                z.object({
                    id: z.number().describe('ID of the assignee.'),
                    name: z.string().describe('Name of the assignee.'),
                    email_address: z.string().optional().describe('Email address of the assignee.')
                })
            )
            .optional()
            .describe('People assigned to the card.'),
        completion_subscribers: z.array(z.unknown()).optional().describe('People subscribed to completion updates.'),
        completion_url: z.string().optional().describe('URL to mark the card as complete.'),
        comment_count: z.number().optional().describe('Number of comments on the card.'),
        steps: z
            .array(
                z.object({
                    id: z.number().describe('ID of the step.'),
                    title: z.string().describe('Title of the step.'),
                    completed: z.boolean().describe('Whether the step is completed.'),
                    due_on: z.string().nullable().optional().describe('Due date of the step in ISO 8601 format.'),
                    assignees: z
                        .array(
                            z.object({
                                id: z.number().describe('ID of the assignee.'),
                                name: z.string().describe('Name of the assignee.')
                            })
                        )
                        .optional()
                        .describe('People assigned to the step.')
                })
            )
            .optional()
            .describe('Steps within the card.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        cards: z.array(CardSchema).describe('The cards in the column.'),
        next_cursor: z.string().optional().describe('Cursor for the next page of results.')
    })
    .describe('Output for listing cards in a Card Table column.');

/**
 * @tags: [read]
 * @tagReason: Lists cards in a Card Table column via a GET request.
 * @pitfalls: Cards reflect live column membership: a card moved to another column immediately disappears from this list.
 */
const action = createAction({
    description: 'List the cards in a Card Table column.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let endpoint: string;
        if (input.cursor) {
            if (input.cursor.startsWith('http')) {
                const url = new URL(input.cursor);
                endpoint = url.pathname + url.search;
            } else {
                endpoint = input.cursor;
            }
        } else {
            endpoint = `/buckets/${encodeURIComponent(input.projectId)}/card_tables/lists/${encodeURIComponent(input.columnId)}/cards.json`;
        }

        const response = await nango.get({
            // https://github.com/basecamp/bc3-api/blob/master/sections/card_table_cards.md#get-cards-in-a-column
            endpoint,
            retries: 3
        });

        const cards = z.array(z.unknown()).parse(response.data);
        const parsedCards = cards.map((card) => CardSchema.parse(card));

        const linkHeader = response.headers['link'] || response.headers['Link'];
        const links = parseLinkHeader(linkHeader);
        const nextCursor = links['next'];

        return {
            cards: parsedCards,
            ...(nextCursor && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
