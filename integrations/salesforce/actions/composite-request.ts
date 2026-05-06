import { z } from 'zod';
import { createAction } from 'nango';

const SubrequestSchema = z.object({
    method: z.string(),
    url: z.string(),
    body: z.record(z.string(), z.unknown()).optional(),
    referenceId: z.string()
});

const InputSchema = z.object({
    apiVersion: z.string().optional(),
    allOrNone: z.boolean().optional(),
    subrequests: z.array(SubrequestSchema).min(1).max(25)
});

const CompositeResultSchema = z.object({
    body: z.unknown().optional(),
    httpStatusCode: z.number(),
    referenceId: z.string()
});

const OutputSchema = z.object({
    compositeResponse: z.array(CompositeResultSchema)
});

const ProviderCompositeResponseSchema = z.object({
    compositeResponse: z.array(
        z.object({
            body: z.unknown().optional(),
            httpHeaders: z.record(z.string(), z.string()).optional(),
            httpStatusCode: z.number(),
            referenceId: z.string()
        })
    )
});

const action = createAction({
    description: 'Execute multiple Salesforce REST subrequests in one composite call.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/composite-request',
        group: 'Composite'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const version = encodeURIComponent(input.apiVersion || 'v59.0');

        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_composite.htm
        const response = await nango.post({
            endpoint: `/services/data/${version}/composite`,
            data: {
                allOrNone: input.allOrNone || false,
                compositeRequest: input.subrequests.map((sub) => ({
                    method: sub.method,
                    url: sub.url,
                    body: sub.body,
                    referenceId: sub.referenceId
                }))
            },
            retries: 3
        });

        const providerData = ProviderCompositeResponseSchema.parse(response.data);

        return {
            compositeResponse: providerData.compositeResponse.map((result) => ({
                body: result.body,
                httpStatusCode: result.httpStatusCode,
                referenceId: result.referenceId
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
