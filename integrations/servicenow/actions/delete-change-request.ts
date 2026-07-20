import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('The sys_id of the change request to delete. Example: "ff3687b9c3ca0310c5a8fc0d05013101"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    sys_id: z.string()
});

const action = createAction({
    description: 'Delete a change request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developer.servicenow.com/dev.do#!/reference/api/now/table/{tableName}/{sys_id}
            endpoint: `/api/now/table/change_request/${encodeURIComponent(input.sys_id)}`,
            retries: 1
        });

        return {
            success: true,
            sys_id: input.sys_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
