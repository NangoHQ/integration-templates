import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('The sys_id of the change request to update. Example: "ff3687b9c3ca0310c5a8fc0d05013101"'),
    fields: z.record(z.string(), z.unknown()).describe('Fields to update on the change request. Example: { "short_description": "Updated description" }')
});

const ProviderResponseSchema = z.object({
    result: z.record(z.string(), z.unknown())
});

const OutputSchema = z.object({
    result: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Update change request fields.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.servicenow.com/dev.do#!/reference/api/rest/table-api
        const response = await nango.patch({
            endpoint: `/api/now/table/change_request/${encodeURIComponent(input.sys_id)}`,
            data: input.fields,
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            result: providerResponse.result
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
