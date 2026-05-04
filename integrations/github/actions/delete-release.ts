import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('Repository owner. Example: "viictoo"'),
    repo: z.string().describe('Repository name. Example: "api-playground2"'),
    release_id: z.number().describe('Release ID to delete. Example: 12345678')
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Delete a release by release ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-release',
        group: 'Releases'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repo'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/releases/releases#delete-a-release
        await nango.delete({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/releases/${input.release_id}`,
            retries: 10
        });

        return {
            success: true,
            message: `Release ${input.release_id} deleted successfully`
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
