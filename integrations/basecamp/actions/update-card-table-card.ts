import { z } from 'zod';
import { createAction } from 'nango';

const AssigneeSchema = z.object({
    id: z.number().describe('Person ID of the assignee'),
    name: z.string().describe('Full name of the assignee')
});

const CardOutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the card'),
        status: z.string().describe('Status of the card, e.g. active or drafted'),
        title: z.string().describe('Title of the card'),
        content: z.string().optional().describe('Content or description of the card'),
        due_on: z.string().optional().describe('Due date in ISO 8601 format (YYYY-MM-DD)'),
        assignees: z.array(AssigneeSchema).describe('People assigned to the card'),
        completed: z.boolean().describe('Whether the card is marked as completed'),
        type: z.string().describe('Basecamp type, e.g. Kanban::Card'),
        url: z.string().describe('API URL of the card'),
        created_at: z.string().describe('Creation timestamp in ISO 8601 format'),
        updated_at: z.string().describe('Last update timestamp in ISO 8601 format')
    })
    .describe('The updated card-table card');

const InputSchema = z
    .object({
        project_id: z.number().describe('Project (bucket) ID that owns the card'),
        card_id: z.number().describe('ID of the card to update'),
        title: z.string().optional().describe('New title for the card'),
        content: z.string().optional().describe('New content or description for the card'),
        due_on: z.string().nullable().optional().describe('New due date in ISO 8601 format (YYYY-MM-DD). Pass null to clear.'),
        assignee_ids: z.array(z.number()).nullable().optional().describe('Array of person IDs to assign. Pass an empty array to remove all assignees.')
    })
    .describe('Input parameters for updating a card-table card');

const ProviderCardSchema = z.object({
    id: z.number(),
    status: z.string(),
    title: z.string(),
    content: z.string().nullable().optional(),
    due_on: z.string().nullable().optional(),
    assignees: z.array(z.object({ id: z.number(), name: z.string() })),
    completed: z.boolean(),
    type: z.string(),
    url: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

/**
 * @tags: [write]
 * @tagReason: Updates an existing card-table card via PUT.
 * @pitfalls: This is a partial update—omitting a field leaves it unchanged. To clear the due date, send due_on as null; to remove all assignees, send assignee_ids as an empty array.
 */
const action = createAction({
    description: "Update a card's title, content, due date, or assignees.",
    version: '1.0.0',
    input: InputSchema,
    output: CardOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof CardOutputSchema>> => {
        const response = await nango.put({
            // https://github.com/basecamp/bc3-api/blob/master/sections/card_table_cards.md#update-a-card
            endpoint: `/buckets/${encodeURIComponent(input.project_id)}/card_tables/cards/${encodeURIComponent(input.card_id)}.json`,
            data: {
                ...(input.title !== undefined && { title: input.title }),
                ...(input.content !== undefined && { content: input.content }),
                ...(input.due_on !== undefined && { due_on: input.due_on }),
                ...(input.assignee_ids !== undefined && { assignee_ids: input.assignee_ids })
            },
            retries: 3
        });

        const providerCard = ProviderCardSchema.parse(response.data);

        return {
            id: providerCard.id,
            status: providerCard.status,
            title: providerCard.title,
            ...(providerCard.content != null && { content: providerCard.content }),
            ...(providerCard.due_on != null && { due_on: providerCard.due_on }),
            assignees: providerCard.assignees,
            completed: providerCard.completed,
            type: providerCard.type,
            url: providerCard.url,
            created_at: providerCard.created_at,
            updated_at: providerCard.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
