import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    story_public_id: z.number().describe('The unique ID of the Story. Example: 35'),
    task_id: z.number().describe('The unique ID of the Task. Example: 39'),
    description: z.string().optional().describe('The new description of the Task.'),
    complete: z.boolean().optional().describe('Whether the Task is completed. Setting true stamps completed_at server-side.'),
    owner_ids: z.array(z.string()).optional().describe('Array of UUIDs for any members to add as Owners on this Task.'),
    before_id: z.number().optional().describe('The ID of the Task we want to move this Task before.'),
    after_id: z.number().optional().describe('The ID of the Task we want to move this Task after.')
});

const ProviderTaskSchema = z.object({
    id: z.number(),
    description: z.string(),
    complete: z.boolean(),
    completed_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string().nullable(),
    entity_type: z.string(),
    story_id: z.number(),
    position: z.number(),
    owner_ids: z.array(z.string()),
    external_id: z.string().nullable(),
    global_id: z.string(),
    mention_ids: z.array(z.string()),
    member_mention_ids: z.array(z.string()),
    group_mention_ids: z.array(z.string())
});

const OutputSchema = z.object({
    id: z.number(),
    description: z.string(),
    complete: z.boolean(),
    completed_at: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string().optional(),
    entity_type: z.string(),
    story_id: z.number(),
    position: z.number(),
    owner_ids: z.array(z.string()),
    external_id: z.string().optional(),
    global_id: z.string(),
    mention_ids: z.array(z.string()),
    member_mention_ids: z.array(z.string()),
    group_mention_ids: z.array(z.string())
});

const action = createAction({
    description: 'Update or complete a task on a story.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developer.shortcut.com/api/rest/v3#UpdateTask
            endpoint: `/api/v3/stories/${encodeURIComponent(input.story_public_id)}/tasks/${encodeURIComponent(input.task_id)}`,
            data: {
                ...(input.description !== undefined && { description: input.description }),
                ...(input.complete !== undefined && { complete: input.complete }),
                ...(input.owner_ids !== undefined && { owner_ids: input.owner_ids }),
                ...(input.before_id !== undefined && { before_id: input.before_id }),
                ...(input.after_id !== undefined && { after_id: input.after_id })
            },
            retries: 3
        });

        const task = ProviderTaskSchema.parse(response.data);

        return {
            id: task.id,
            description: task.description,
            complete: task.complete,
            ...(task.completed_at != null && { completed_at: task.completed_at }),
            created_at: task.created_at,
            ...(task.updated_at != null && { updated_at: task.updated_at }),
            entity_type: task.entity_type,
            story_id: task.story_id,
            position: task.position,
            owner_ids: task.owner_ids,
            ...(task.external_id != null && { external_id: task.external_id }),
            global_id: task.global_id,
            mention_ids: task.mention_ids,
            member_mention_ids: task.member_mention_ids,
            group_mention_ids: task.group_mention_ids
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
