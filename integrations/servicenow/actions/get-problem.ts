import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('Problem sys_id. Example: "8f3647b9c3ca0310c5a8fc0d05013176"')
});

const ProviderProblemSchema = z
    .object({
        sys_id: z.string(),
        number: z.string().optional().nullable(),
        short_description: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        state: z.string().optional().nullable(),
        impact: z.string().optional().nullable(),
        urgency: z.string().optional().nullable(),
        priority: z.string().optional().nullable(),
        opened_at: z.string().optional().nullable(),
        sys_updated_on: z.string().optional().nullable(),
        sys_created_on: z.string().optional().nullable(),
        sys_updated_by: z.string().optional().nullable(),
        sys_created_by: z.string().optional().nullable(),
        close_notes: z.string().optional().nullable(),
        resolution_code: z.string().optional().nullable(),
        root_cause: z.string().optional().nullable(),
        comments: z.string().optional().nullable(),
        work_notes: z.string().optional().nullable()
    })
    .passthrough();

const ApiResponseSchema = z.object({
    result: ProviderProblemSchema
});

const OutputSchema = ProviderProblemSchema;

const action = createAction({
    description: 'Retrieve a problem.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.servicenow.com/dev.do#!/reference/api
            endpoint: `/api/now/table/problem/${encodeURIComponent(input.sys_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Problem not found',
                sys_id: input.sys_id
            });
        }

        const apiResponse = ApiResponseSchema.safeParse(response.data);
        if (!apiResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response structure from ServiceNow',
                sys_id: input.sys_id
            });
        }

        return apiResponse.data.result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
