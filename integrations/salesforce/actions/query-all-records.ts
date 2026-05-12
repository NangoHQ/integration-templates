import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().describe('SOQL query string. Example: "SELECT Id, Name FROM Account"'),
    apiVersion: z.string().optional().describe('Salesforce API version. Example: "v60.0". If omitted, uses the connection default.')
});

const RecordSchema = z.record(z.string(), z.unknown());

const ProviderQueryAllResponseSchema = z.object({
    totalSize: z.number(),
    done: z.boolean(),
    records: z.array(RecordSchema),
    nextRecordsUrl: z.string().optional().nullable()
});

const RecordOutputSchema = z.record(z.string(), z.unknown());

const OutputSchema = z.object({
    totalSize: z.number(),
    done: z.boolean(),
    records: z.array(RecordOutputSchema),
    nextRecordsUrl: z.string().optional()
});

const action = createAction({
    description: 'Run a SOQL query that also includes deleted and archived records.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/query-all-records',
        group: 'Query'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api', 'refresh_token'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const version = input.apiVersion || 'v60.0';

        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_queryall.htm
        const response = await nango.get({
            endpoint: `/services/data/${version}/queryAll`,
            params: {
                q: input.query
            },
            retries: 3
        });

        const rawData = ProviderQueryAllResponseSchema.parse(response.data);

        return {
            totalSize: rawData.totalSize,
            done: rawData.done,
            records: rawData.records,
            ...(rawData.nextRecordsUrl != null && rawData.nextRecordsUrl !== undefined && { nextRecordsUrl: rawData.nextRecordsUrl })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
