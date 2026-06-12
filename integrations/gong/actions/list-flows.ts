import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    flowOwnerEmail: z.string().describe('Email address of the user who owns the flows. Example: "api@nango.dev"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const FlowSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        status: z.string().optional(),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    flows: z.array(FlowSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List Gong Engage flows owned by a specific user.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-flows',
        group: 'Flows'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:flows:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://help.gong.io/docs/what-the-gong-api-provides
        const response = await nango.get({
            endpoint: '/v2/flows',
            params: {
                flowOwnerEmail: input.flowOwnerEmail,
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                flows: z.array(z.unknown()).optional(),
                cursor: z.string().optional()
            })
            .passthrough()
            .parse(response.data);

        const typedFlows = (providerResponse.flows || []).map((record) => FlowSchema.parse(record));

        return {
            flows: typedFlows,
            ...(providerResponse.cursor !== undefined && providerResponse.cursor !== null && { nextCursor: providerResponse.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
