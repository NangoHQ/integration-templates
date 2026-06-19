import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    version: z.string().optional().describe('Salesforce API version. Example: "v63.0". Defaults to v63.0.'),
    soql: z.string().describe('SOQL query string. Example: "SELECT Id, Name FROM Account LIMIT 10"')
});

const ProviderRecordSchema = z.record(z.string(), z.unknown());

const ProviderQueryResponseSchema = z.object({
    totalSize: z.number(),
    done: z.boolean(),
    records: z.array(ProviderRecordSchema),
    nextRecordsUrl: z.string().optional()
});

const OutputSchema = z.object({
    totalSize: z.number(),
    done: z.boolean(),
    records: z.array(z.record(z.string(), z.unknown())),
    nextRecordsUrl: z.string().optional()
});

const action = createAction({
    description: 'Run a SOQL query and return matching records',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api', 'refresh_token'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const version = input.version || 'v63.0';
        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
        const response = await nango.get({
            endpoint: `/services/data/${encodeURIComponent(version)}/query`,
            params: {
                q: input.soql
            },
            retries: 3
        });

        const result = ProviderQueryResponseSchema.parse(response.data);

        return {
            totalSize: result.totalSize,
            done: result.done,
            records: result.records,
            ...(result.nextRecordsUrl !== undefined && { nextRecordsUrl: result.nextRecordsUrl })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
