import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderCallOutcomeSchema = z
    .object({
        id: z.string().optional(),
        category: z.string().optional(),
        name: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    outcomes: z.array(ProviderCallOutcomeSchema).optional(),
    cursor: z.string().optional()
});

const CallOutcomeItemSchema = z
    .object({
        id: z.string().optional(),
        category: z.string().optional(),
        name: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(CallOutcomeItemSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List all configured call outcomes in Gong.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-call-outcomes',
        group: 'Call Outcomes'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:call-outcomes:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://help.gong.io/apidocs/list-call-outcomes-v2call-outcomes-1
        const response = await nango.get({
            endpoint: '/v2/call-outcomes',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.outcomes ?? [];

        return {
            items: items,
            ...(providerResponse.cursor !== undefined && { nextCursor: providerResponse.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
