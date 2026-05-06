import { z } from 'zod';
import { createAction } from 'nango';

const SubrequestSchema = z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).describe('HTTP method for the subrequest. Example: "GET"'),
    url: z.string().describe('URL path for the subrequest (without the instance URL). Example: "v57.0/sobjects/Account/001D000000K0fXOIAZ"'),
    richInput: z.record(z.string(), z.any()).optional().describe('Request body for POST, PUT, or PATCH requests'),
    binaryPartName: z.string().optional().describe('Name of the binary part for multipart requests'),
    binaryPartNameAlias: z.string().optional().describe('Alias for the binary part name')
});

const InputSchema = z.object({
    apiVersion: z.string().optional().describe('Salesforce API version. Defaults to v57.0. Example: "v57.0"'),
    haltOnError: z.boolean().optional().describe('If true, stop processing subrequests after a failure. Defaults to false.'),
    batchRequests: z.array(SubrequestSchema).min(1).max(25).describe('Array of subrequests to execute (1-25 requests)')
});

const SubrequestResultSchema = z.object({
    statusCode: z.number().describe('HTTP status code for this subrequest'),
    result: z.unknown().describe('Response body from this subrequest, which varies by endpoint')
});

const OutputSchema = z.object({
    hasErrors: z.boolean().describe('True if any subrequest resulted in an error'),
    results: z.array(SubrequestResultSchema).describe('Results for each subrequest in the order they were submitted')
});

const action = createAction({
    description: 'Execute multiple independent Salesforce REST subrequests in one batch call',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/composite-batch-request',
        group: 'Composite'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_composite_batch.htm
        const apiVersion = input.apiVersion ?? 'v57.0';
        const haltOnError = input.haltOnError ?? false;
        const response = await nango.post({
            endpoint: `/services/data/${apiVersion}/composite/batch`,
            data: {
                haltOnError: haltOnError,
                batchRequests: input.batchRequests
            },
            retries: 3
        });

        const rawResults = z
            .object({
                hasErrors: z.boolean(),
                results: z.array(
                    z.object({
                        statusCode: z.number(),
                        result: z.unknown()
                    })
                )
            })
            .parse(response.data);

        return {
            hasErrors: rawResults.hasErrors,
            results: rawResults.results.map((r) => ({
                statusCode: r.statusCode,
                result: r.result
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
