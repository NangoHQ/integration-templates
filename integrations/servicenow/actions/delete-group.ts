import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('The sys_id of the group to delete. Example: "284687b9c3ca0310c5a8fc0d05013151"')
});

const ProviderResponseSchema = z
    .object({
        sys_id: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    sys_id: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete a group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.servicenow.com/dev.do#!/reference/api/TableAPI
            endpoint: `/api/now/table/sys_user_group/${encodeURIComponent(input.sys_id)}`,
            retries: 3
        };

        const response = await nango.delete(config);

        const providerResponse =
            typeof response.data === 'object' && response.data != null ? ProviderResponseSchema.parse(response.data) : { sys_id: input.sys_id };

        return {
            sys_id: providerResponse.sys_id,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
