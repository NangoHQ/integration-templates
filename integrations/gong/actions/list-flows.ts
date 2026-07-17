import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    flowOwnerEmail: z.string().describe('Email address of the user who owns the flows. Example: "api@nango.dev"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const FlowSchema = z
    .object({
        id: z.string(),
        name: z.string().nullish(),
        status: z.string().nullish(),
        createdAt: z.string().nullish(),
        updatedAt: z.string().nullish()
    })
    .passthrough();

const OutputSchema = z.object({
    flows: z.array(FlowSchema).nullable(),
    nextCursor: z.string().nullish()
});

const action = createAction({
    description: 'List Gong Engage flows owned by a specific user.',
    version: '1.0.2',
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
                cursor: z.string().optional(),
                records: z.object({ cursor: z.string().optional() }).optional()
            })
            .passthrough()
            .parse(response.data);

        const typedFlows = (providerResponse.flows || []).map((record) => FlowSchema.parse(record));

        const nextCursor = providerResponse.cursor ?? providerResponse.records?.cursor;
        return {
            flows: typedFlows,
            ...(nextCursor != null && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
