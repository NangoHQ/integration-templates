import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('Repository owner. Example: "viictoo"'),
    repo: z.string().describe('Repository name. Example: "api-playground2"'),
    name: z.string().describe('Label name to delete. Example: "bug"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string()
});

const action = createAction({
    description: 'Delete a repository label by name',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-label',
        group: 'Labels'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/issues/labels#delete-a-label
        await nango.delete({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/labels/${encodeURIComponent(input.name)}`,
            retries: 3
        });

        return {
            success: true,
            message: `Label "${input.name}" deleted successfully`
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
