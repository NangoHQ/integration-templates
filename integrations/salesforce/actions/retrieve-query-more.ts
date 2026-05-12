import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    nextRecordsUrl: z
        .string()
        .describe('The nextRecordsUrl from a previous query or queryAll response. Example: "/services/data/v62.0/query/01gD00000000abcIAQ-2000"')
});

const SObjectSchema = z.object({}).passthrough();

const ProviderOutputSchema = z.object({
    done: z.boolean(),
    totalSize: z.number(),
    records: z.array(SObjectSchema),
    nextRecordsUrl: z.string().optional()
});

const OutputSchema = z.object({
    done: z.boolean(),
    totalSize: z.number(),
    records: z.array(SObjectSchema),
    nextRecordsUrl: z.string().optional()
});

const action = createAction({
    description: 'Continue a SOQL query using a nextRecordsUrl locator',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/retrieve-query-more',
        group: 'Query'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/dome_query.htm
        // Query More Results - use the nextRecordsUrl from a previous query response
        const response = await nango.get({
            endpoint: input.nextRecordsUrl,
            retries: 3
        });

        const parsed = ProviderOutputSchema.parse(response.data);

        return {
            done: parsed.done,
            totalSize: parsed.totalSize,
            records: parsed.records,
            ...(parsed.nextRecordsUrl !== undefined && { nextRecordsUrl: parsed.nextRecordsUrl })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
