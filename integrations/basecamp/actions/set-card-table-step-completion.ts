import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the Basecamp project (bucket) containing the step.'),
        stepId: z.number().describe('The ID of the card table step to update.'),
        completion: z.enum(['on', 'off']).describe('The completion state to set: "on" to mark completed, "off" to mark uncompleted.')
    })
    .describe('Input to mark a card table step as completed or uncompleted.');

const ParentSchema = z.object({
    id: z.number().describe('The ID of the parent card.'),
    title: z.string().describe('The title of the parent card.'),
    type: z.string().describe('The type of the parent record.')
});

const BucketSchema = z.object({
    id: z.number().describe('The ID of the project bucket.'),
    name: z.string().describe('The name of the project bucket.'),
    type: z.string().describe('The type of the bucket record.')
});

const CreatorSchema = z.object({
    id: z.number().describe('The ID of the user.'),
    name: z.string().describe('The name of the user.'),
    email_address: z.string().describe('The email address of the user.')
});

const CompletionSchema = z
    .object({
        created_at: z.string().describe('The timestamp when the step was completed.'),
        creator: CreatorSchema.describe('The user who completed the step.')
    })
    .describe('Completion metadata when the step is marked as completed.');

const OutputSchema = z
    .object({
        id: z.number().describe('The ID of the card table step.'),
        status: z.string().describe('The status of the step.'),
        title: z.string().describe('The title of the step.'),
        type: z.string().describe('The type of the record.'),
        completed: z.boolean().describe('Whether the step is completed.'),
        completion: CompletionSchema.optional().describe('Completion details when the step is completed.'),
        created_at: z.string().describe('The creation timestamp.'),
        updated_at: z.string().describe('The last update timestamp.'),
        url: z.string().describe('The API URL of the step.'),
        app_url: z.string().describe('The Basecamp app URL of the step.'),
        position: z.number().describe('The position of the step within its parent card.'),
        parent: ParentSchema.describe('The parent card of this step.'),
        bucket: BucketSchema.describe('The project bucket containing this step.'),
        creator: CreatorSchema.describe('The user who created this step.'),
        due_on: z.string().optional().describe('The due date of the step, if any.'),
        assignees: z
            .array(z.object({ id: z.number().describe('The ID of the assignee.'), name: z.string().describe('The name of the assignee.') }))
            .describe('Users assigned to this step.')
    })
    .describe('The updated card table step.');

const ProviderStepSchema = z.object({
    id: z.number(),
    status: z.string(),
    title: z.string(),
    type: z.string(),
    completed: z.boolean(),
    completion: z
        .object({
            created_at: z.string(),
            creator: z.object({
                id: z.number(),
                name: z.string(),
                email_address: z.string()
            })
        })
        .optional(),
    created_at: z.string(),
    updated_at: z.string(),
    url: z.string(),
    app_url: z.string(),
    position: z.number(),
    parent: z.object({
        id: z.number(),
        title: z.string(),
        type: z.string()
    }),
    bucket: z.object({
        id: z.number(),
        name: z.string(),
        type: z.string()
    }),
    creator: z.object({
        id: z.number(),
        name: z.string(),
        email_address: z.string()
    }),
    due_on: z.string().nullable().optional(),
    assignees: z.array(
        z.object({
            id: z.number(),
            name: z.string()
        })
    )
});

/**
 * @tags: [write]
 * @tagReason: Mutates the completion status of a card table step.
 */
const action = createAction({
    description: 'Mark a card table step as completed or uncompleted.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://github.com/basecamp/bc3-api/blob/master/sections/card_table_steps.md
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/card_tables/steps/${encodeURIComponent(input.stepId)}/completions.json`,
            data: {
                completion: input.completion
            },
            retries: 3
        };

        const response = await nango.put(config);

        const providerStep = ProviderStepSchema.parse(response.data);

        return {
            id: providerStep.id,
            status: providerStep.status,
            title: providerStep.title,
            type: providerStep.type,
            completed: providerStep.completed,
            ...(providerStep.completion && { completion: providerStep.completion }),
            created_at: providerStep.created_at,
            updated_at: providerStep.updated_at,
            url: providerStep.url,
            app_url: providerStep.app_url,
            position: providerStep.position,
            parent: providerStep.parent,
            bucket: providerStep.bucket,
            creator: providerStep.creator,
            ...(providerStep.due_on != null && { due_on: providerStep.due_on }),
            assignees: providerStep.assignees
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
