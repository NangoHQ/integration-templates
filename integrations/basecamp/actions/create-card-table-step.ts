import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the Basecamp project (bucket) containing the card.'),
        cardId: z.number().describe('The ID of the card table card to add the step to.'),
        title: z.string().describe('The title of the step to create.'),
        due_on: z.string().optional().describe('The due date for the step in ISO 8601 format (YYYY-MM-DD).'),
        assignee_ids: z.array(z.number()).optional().describe('An array of person IDs to assign to the step.')
    })
    .describe('Input to create a checklist step on a Basecamp card table card.');

const ProviderStepSchema = z.object({
    id: z.number(),
    status: z.string(),
    visible_to_clients: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    title: z.string(),
    inherits_status: z.boolean(),
    type: z.string(),
    url: z.string(),
    app_url: z.string(),
    bookmark_url: z.string(),
    position: z.number(),
    parent: z.object({
        id: z.number(),
        title: z.string(),
        type: z.string(),
        url: z.string(),
        app_url: z.string()
    }),
    bucket: z.object({
        id: z.number(),
        name: z.string(),
        type: z.string()
    }),
    creator: z.object({
        id: z.number(),
        name: z.string(),
        email_address: z.string().nullable()
    }),
    completed: z.boolean(),
    due_on: z.string().nullable(),
    assignees: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            email_address: z.string().nullable()
        })
    ),
    completion_url: z.string()
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique ID of the created step.'),
        title: z.string().describe('The title of the step.'),
        completed: z.boolean().describe('Whether the step is marked as completed.'),
        due_on: z.string().nullable().describe('The due date of the step in ISO 8601 format (YYYY-MM-DD).'),
        url: z.string().describe('The API URL of the step.'),
        app_url: z.string().describe('The Basecamp app URL of the step.'),
        position: z.number().describe('The 1-based position of the step within the card.'),
        created_at: z.string().describe('The creation timestamp of the step in ISO 8601 format.'),
        updated_at: z.string().describe('The last updated timestamp of the step in ISO 8601 format.'),
        parent: z
            .object({
                id: z.number().describe('The ID of the parent card.'),
                title: z.string().describe('The title of the parent card.'),
                type: z.string().describe('The type of the parent resource.'),
                url: z.string().describe('The API URL of the parent card.'),
                app_url: z.string().describe('The app URL of the parent card.')
            })
            .describe('The parent card this step belongs to.'),
        bucket: z
            .object({
                id: z.number().describe('The ID of the project (bucket).'),
                name: z.string().describe('The name of the project.'),
                type: z.string().describe('The type of the bucket resource.')
            })
            .describe('The project (bucket) containing this step.'),
        creator: z
            .object({
                id: z.number().describe('The ID of the person who created the step.'),
                name: z.string().describe('The full name of the creator.'),
                email_address: z.string().optional().describe('The email address of the creator, omitted for some integration-type people.')
            })
            .describe('The person who created the step.'),
        assignees: z
            .array(
                z.object({
                    id: z.number().describe('The ID of the assigned person.'),
                    name: z.string().describe('The full name of the assigned person.'),
                    email_address: z.string().optional().describe('The email address of the assigned person, omitted for some integration-type people.')
                })
            )
            .describe('The people assigned to this step.')
    })
    .describe('The created card table step, including its parent card, bucket, creator, and assignees.');

/**
 * @tags: [write]
 * @tagReason: Creates a new checklist step on a Basecamp card table card.
 */
const action = createAction({
    description: 'Create a checklist step on a card table card.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            title: input.title
        };

        if (input['due_on'] !== undefined) {
            body['due_on'] = input['due_on'];
        }

        if (input['assignee_ids'] !== undefined) {
            body['assignee_ids'] = input['assignee_ids'];
        }

        const response = await nango.post({
            // https://github.com/basecamp/bc3-api/blob/master/sections/card_table_steps.md#create-a-step
            endpoint: `/buckets/${encodeURIComponent(String(input.projectId))}/card_tables/cards/${encodeURIComponent(String(input.cardId))}/steps.json`,
            data: body,
            retries: 3
        });

        const step = ProviderStepSchema.parse(response.data);

        return {
            id: step.id,
            title: step.title,
            completed: step.completed,
            due_on: step.due_on,
            url: step.url,
            app_url: step.app_url,
            position: step.position,
            created_at: step.created_at,
            updated_at: step.updated_at,
            parent: step.parent,
            bucket: step.bucket,
            creator: {
                id: step.creator.id,
                name: step.creator.name,
                ...(step.creator.email_address != null && { email_address: step.creator.email_address })
            },
            assignees: step.assignees.map((assignee) => ({
                id: assignee.id,
                name: assignee.name,
                ...(assignee.email_address != null && { email_address: assignee.email_address })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
