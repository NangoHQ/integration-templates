import { z } from 'zod';
import { createAction } from 'nango';

const CompositeSubrequestSchema = z.object({
    method: z.union([z.literal('DELETE'), z.literal('GET'), z.literal('PATCH'), z.literal('POST')]),
    url: z.string(),
    referenceId: z.string(),
    body: z.object({}).catchall(z.unknown()).optional()
});

const GraphSchema = z.object({
    graphId: z.string(),
    compositeRequest: z.array(CompositeSubrequestSchema)
});

const InputSchema = z.object({
    graphs: z.array(GraphSchema),
    apiVersion: z.string().optional()
});

const CompositeSubresponseSchema = z.object({
    body: z.unknown(),
    httpHeaders: z.object({}).catchall(z.unknown()).optional(),
    httpStatusCode: z.number(),
    referenceId: z.string()
});

const GraphResponseSchema = z.object({
    graphId: z.string(),
    graphResponse: z.object({
        compositeResponse: z.array(CompositeSubresponseSchema)
    }),
    isSuccessful: z.boolean()
});

const OutputSchema = z.object({
    graphs: z.array(GraphResponseSchema)
});

const action = createAction({
    description:
        'Execute a dependent graph of subrequests in one composite graph call. Supports up to 500 subrequests across multiple graphs with automatic rollback on failure.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/composite-graph-request',
        group: 'Composite'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const apiVersion = input.apiVersion || 'v66.0';

        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_composite_graph.htm
        const response = await nango.post({
            endpoint: `/services/data/${encodeURIComponent(apiVersion)}/composite/graph`,
            data: {
                graphs: input.graphs
            },
            retries: 3
        });

        const parsed = OutputSchema.safeParse(response.data);
        if (!parsed.success) {
            await nango.log('Response validation failed', { error: parsed.error, data: response.data });
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response format from Salesforce Composite Graph API'
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
