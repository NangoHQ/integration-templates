import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_gid: z.string().describe('The task to remove the tag from. Example: "12345"'),
    tag_gid: z.string().describe('The tag to remove from the task. Example: "67890"')
});

const ProviderResponseSchema = z.object({
    data: z.unknown()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Remove a tag from a task.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/remove-tag-from-task',
        group: 'Tasks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.asana.com/reference/removetagfortask
            endpoint: `/api/1.0/tasks/${input.task_gid}/removeTag`,
            data: {
                data: {
                    tag: input.tag_gid
                }
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Asana API',
                details: parsed.error.format()
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
