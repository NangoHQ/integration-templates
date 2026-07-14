import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('Group sys_id. Example: "284687b9c3ca0310c5a8fc0d05013151"')
});

const ProviderGroupSchema = z
    .object({
        sys_id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        active: z.string().optional(),
        manager: z.string().optional(),
        parent: z.string().optional(),
        sys_created_on: z.string().optional(),
        sys_updated_on: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        sys_id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        active: z.string().optional(),
        manager: z.string().optional(),
        parent: z.string().optional(),
        sys_created_on: z.string().optional(),
        sys_updated_on: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.servicenow.com/dev.do#!/reference/api/now/rest/table-api#get-table-by-id
        const response = await nango.get({
            endpoint: `/api/now/table/sys_user_group/${encodeURIComponent(input.sys_id)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || !('result' in response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Group not found or unexpected response format'
            });
        }

        const result = ProviderGroupSchema.parse(response.data.result);

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
