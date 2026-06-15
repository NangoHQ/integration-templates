import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderLeaveTypeSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    type: z.string().optional(),
    isGrantBased: z.boolean().optional(),
    isDisabled: z.boolean().optional(),
    isV2: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    leavetypes: z.array(ProviderLeaveTypeSchema).optional().default([])
});

const OutputSchema = z.object({
    leavetypes: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            color: z.string().optional(),
            type: z.string().optional(),
            isGrantBased: z.boolean().optional(),
            isDisabled: z.boolean().optional(),
            isV2: z.boolean().optional()
        })
    )
});

const action = createAction({
    description: 'List all leave type definitions.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-leave-types',
        group: 'Leave'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/people/api/overview.html
        const response = await nango.get({
            endpoint: '/api/v2/leavetracker/leavetypes',
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            leavetypes: providerResponse.leavetypes.map((leaveType) => ({
                id: leaveType.id,
                name: leaveType.name,
                ...(leaveType.color !== undefined && { color: leaveType.color }),
                ...(leaveType.type !== undefined && { type: leaveType.type }),
                ...(leaveType.isGrantBased !== undefined && { isGrantBased: leaveType.isGrantBased }),
                ...(leaveType.isDisabled !== undefined && { isDisabled: leaveType.isDisabled }),
                ...(leaveType.isV2 !== undefined && { isV2: leaveType.isV2 })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
