import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('Workspace ID. Example: "149ca924-4333-471b-94b5-347eca3f9938"'),
    datasetId: z.string().describe('Dataset ID. Example: "a71c1b98-a0db-4423-a81b-5dcb48d5c8d1"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    groupId: z.string(),
    datasetId: z.string()
});

const action = createAction({
    description: "Transfer ownership of a dataset's data source credentials to the caller.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/take-over-in-group
        await nango.post({
            endpoint: `/v1.0/myorg/groups/${encodeURIComponent(input.groupId)}/datasets/${encodeURIComponent(input.datasetId)}/Default.TakeOver`,
            retries: 3
        });

        return {
            success: true,
            groupId: input.groupId,
            datasetId: input.datasetId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
