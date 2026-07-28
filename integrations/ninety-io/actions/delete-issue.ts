import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueId: z.string().describe('The unique identifier of the issue to delete. Example: "6a6174eeec1cad4577a10b9a"')
});

const OutputSchema = z.object({
    issueId: z.string()
});

const action = createAction({
    description: 'Permanently delete an issue.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://help.ninety.io/en/articles/15505694-api-reference-and-access
        await nango.delete({
            endpoint: `v1/issues/${encodeURIComponent(input.issueId)}`,
            retries: 1
        });

        return {
            issueId: input.issueId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
