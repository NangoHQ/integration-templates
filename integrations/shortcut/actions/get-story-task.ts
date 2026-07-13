import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    story_public_id: z.number().int().describe('The unique ID of the Story. Example: 35'),
    task_id: z.number().int().describe('The unique ID of the Task. Example: 39')
});

const ProviderTaskSchema = z.object({
    id: z.number(),
    complete: z.boolean(),
    description: z.string(),
    owner_ids: z.array(z.string()),
    position: z.number()
});

const OutputSchema = z.object({
    id: z.number(),
    complete: z.boolean(),
    description: z.string(),
    owner_ids: z.array(z.string()),
    position: z.number()
});

const action = createAction({
    description: 'Retrieve a single task on a story.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shortcut.com/api/rest/v3#get-task
            endpoint: `/api/v3/stories/${encodeURIComponent(input.story_public_id)}/tasks/${encodeURIComponent(input.task_id)}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Task ${input.task_id} not found on story ${input.story_public_id}`
            });
        }

        const providerTask = ProviderTaskSchema.parse(response.data);

        return {
            id: providerTask.id,
            complete: providerTask.complete,
            description: providerTask.description,
            owner_ids: providerTask.owner_ids,
            position: providerTask.position
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
