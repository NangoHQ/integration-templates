import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('Change request sys_id. Example: "ff3687b9c3ca0310c5a8fc0d05013101"')
});

const OutputSchema = z
    .object({
        sys_id: z.string(),
        number: z.string().optional(),
        short_description: z.string().optional(),
        description: z.string().optional(),
        state: z.string().optional(),
        priority: z.string().optional(),
        impact: z.string().optional(),
        urgency: z.string().optional(),
        risk: z.string().optional(),
        approval: z.string().optional(),
        type: z.string().optional(),
        category: z.string().optional(),
        requested_by: z.unknown().optional(),
        opened_by: z.unknown().optional(),
        opened_at: z.string().optional(),
        sys_updated_on: z.string().optional(),
        sys_created_on: z.string().optional(),
        close_code: z.string().optional(),
        close_notes: z.string().optional(),
        active: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a change request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.servicenow.com/dev.do#!/reference/api/now/table/change_request
            endpoint: `/api/now/table/change_request/${encodeURIComponent(input.sys_id)}`,
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            result: z.unknown()
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.result || typeof providerResponse.result !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Change request not found',
                sys_id: input.sys_id
            });
        }

        const changeRequest = OutputSchema.parse(providerResponse.result);

        return changeRequest;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
