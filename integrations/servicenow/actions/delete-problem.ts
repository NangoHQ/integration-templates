import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('The sys_id of the problem to delete. Example: "8f3647b9c3ca0310c5a8fc0d05013176"')
});

const ProviderResultSchema = z.object({
    sys_id: z.string(),
    number: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    result: ProviderResultSchema
});

const OutputSchema = z.object({
    sys_id: z.string(),
    number: z.string().optional()
});

const action = createAction({
    description: 'Delete a problem',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.servicenow.com/dev.do#!/reference/api/now/table/{tableName}/{sys_id}
            endpoint: `/api/now/table/problem/${encodeURIComponent(input.sys_id)}`,
            retries: 3
        });

        if (response.status === 204 || !response.data || typeof response.data !== 'object') {
            return {
                sys_id: input.sys_id
            };
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const providerResult = providerResponse.result;

        return {
            sys_id: providerResult.sys_id,
            ...(providerResult.number != null && { number: providerResult.number })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
