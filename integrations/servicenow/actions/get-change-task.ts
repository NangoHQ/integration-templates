import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('The sys_id of the change task to retrieve. Example: "74668bb9c3ca0310c5a8fc0d050131a2"')
});

const ChangeTaskSchema = z
    .object({
        sys_id: z.string()
    })
    .passthrough();

const OutputSchema = ChangeTaskSchema;

const action = createAction({
    description: 'Retrieve a change task.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.servicenow.com/dev.do#!/reference/api
        const response = await nango.get({
            endpoint: `/api/now/table/change_task/${encodeURIComponent(input.sys_id)}`,
            retries: 3
        });

        const providerResponse = z
            .object({
                result: ChangeTaskSchema
            })
            .parse(response.data);

        return providerResponse.result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
