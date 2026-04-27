import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_gid: z.string().describe('The task to operate on. Example: "1200000000000001"'),
    tag_gid: z.string().describe('The tag to add to the task. Example: "1200000000000002"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Attach an existing tag to a task.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/add-tag-to-task',
        group: 'Tasks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.asana.com/reference/addtagfortask
        const response = await nango.post({
            endpoint: `/tasks/${input.task_gid}/addTag`,
            baseUrlOverride: 'https://app.asana.com/api/1.0',
            data: {
                data: {
                    tag: input.tag_gid
                }
            },
            retries: 3
        });

        z.object({
            data: z.unknown()
        }).parse(response.data);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
