import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('The Basecamp project (bucket) ID. Example: "48644099"'),
        columnId: z.string().describe('The Card Table column ID where the card should be created. Example: "10239340944"'),
        title: z.string().describe('The title of the card.'),
        content: z.string().optional().describe('Rich text content describing the card.'),
        due_on: z.string().optional().describe('Due date for the card in ISO 8601 format. Example: "2026-08-30"'),
        notify: z.boolean().optional().describe('Whether to notify assignees. Defaults to false.')
    })
    .describe('Input to create a card in a Basecamp Card Table column.');

const CreatorSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional()
});

const ParentSchema = z.object({
    id: z.number(),
    title: z.string().nullable().optional(),
    type: z.string().nullable().optional()
});

const BucketSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    type: z.string().nullable().optional()
});

const ProviderCardSchema = z.object({
    id: z.number(),
    status: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    app_url: z.string().nullable().optional(),
    position: z.number().nullable().optional(),
    content: z.string().nullable().optional(),
    due_on: z.string().nullable().optional(),
    completed: z.boolean().nullable().optional(),
    comment_count: z.number().nullable().optional(),
    parent: ParentSchema.nullable().optional(),
    bucket: BucketSchema.nullable().optional(),
    creator: CreatorSchema.nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique ID of the created card.'),
        status: z.string().optional().describe('The status of the card, such as active or drafted.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the card was created.'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp when the card was last updated.'),
        title: z.string().optional().describe('The title of the card.'),
        type: z.string().optional().describe('The Basecamp record type, typically "Kanban::Card".'),
        url: z.string().optional().describe('The API URL for the card.'),
        app_url: z.string().optional().describe('The Basecamp web app URL for the card.'),
        position: z.number().optional().describe('The 1-indexed position of the card within its column.'),
        content: z.string().optional().describe('The rich text content of the card.'),
        due_on: z.string().nullable().optional().describe('The due date in ISO 8601 format, or null if not set.'),
        completed: z.boolean().optional().describe('Whether the card is marked as completed.'),
        comment_count: z.number().optional().describe('The number of comments on the card.'),
        parent: z
            .object({
                id: z.number().describe('The column ID.'),
                title: z.string().optional().describe('The column title.'),
                type: z.string().optional().describe('The column type.')
            })
            .optional()
            .describe('The column that contains the card.'),
        bucket: z
            .object({
                id: z.number().describe('The project ID.'),
                name: z.string().optional().describe('The project name.'),
                type: z.string().optional().describe('The bucket type, typically "Project".')
            })
            .optional()
            .describe('The project the card belongs to.'),
        creator: z
            .object({
                id: z.number().describe('The person ID of the card creator.'),
                name: z.string().optional().describe('The name of the card creator.')
            })
            .optional()
            .describe('The person who created the card.')
    })
    .describe('Output of a newly created card in a Basecamp Card Table column.');

/**
 * @tags: [write]
 * @tagReason: Creates a new card in a Basecamp Card Table column.
 * @pitfalls: Assignees cannot be set on creation; update the card afterward to add them. Content is rich text restricted to a whitelist of allowed HTML tags.
 */
const action = createAction({
    description: 'Create a card in a Card Table column.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            title: input.title
        };

        if (input.content !== undefined) {
            body['content'] = input.content;
        }

        if (input.due_on !== undefined) {
            body['due_on'] = input.due_on;
        }

        if (input.notify !== undefined) {
            body['notify'] = input.notify;
        }

        // https://github.com/basecamp/bc3-api/blob/master/sections/card_table_cards.md#create-a-card
        const response = await nango.post({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/card_tables/lists/${encodeURIComponent(input.columnId)}/cards.json`,
            data: body,
            retries: 3
        });

        if (response.status !== 200 && response.status !== 201) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Unexpected response status ${response.status} from Basecamp.`,
                status: response.status
            });
        }

        const providerCard = ProviderCardSchema.parse(response.data);

        const parent = providerCard.parent
            ? {
                  id: providerCard.parent.id,
                  ...(providerCard.parent.title != null && { title: providerCard.parent.title }),
                  ...(providerCard.parent.type != null && { type: providerCard.parent.type })
              }
            : undefined;

        const bucket = providerCard.bucket
            ? {
                  id: providerCard.bucket.id,
                  ...(providerCard.bucket.name != null && { name: providerCard.bucket.name }),
                  ...(providerCard.bucket.type != null && { type: providerCard.bucket.type })
              }
            : undefined;

        const creator = providerCard.creator
            ? {
                  id: providerCard.creator.id,
                  ...(providerCard.creator.name != null && { name: providerCard.creator.name })
              }
            : undefined;

        return {
            id: providerCard.id,
            ...(providerCard.status != null && { status: providerCard.status }),
            ...(providerCard.created_at != null && { created_at: providerCard.created_at }),
            ...(providerCard.updated_at != null && { updated_at: providerCard.updated_at }),
            ...(providerCard.title != null && { title: providerCard.title }),
            ...(providerCard.type != null && { type: providerCard.type }),
            ...(providerCard.url != null && { url: providerCard.url }),
            ...(providerCard.app_url != null && { app_url: providerCard.app_url }),
            ...(providerCard.position != null && { position: providerCard.position }),
            ...(providerCard.content != null && { content: providerCard.content }),
            due_on: providerCard.due_on,
            ...(providerCard.completed != null && { completed: providerCard.completed }),
            ...(providerCard.comment_count != null && { comment_count: providerCard.comment_count }),
            ...(parent != null && { parent }),
            ...(bucket != null && { bucket }),
            ...(creator != null && { creator })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
