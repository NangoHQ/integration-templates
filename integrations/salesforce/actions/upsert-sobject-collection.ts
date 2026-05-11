import { z } from 'zod';
import { createAction } from 'nango';

const RecordSchema = z.object({}).passthrough().describe('Record fields including the external ID field');

const InputSchema = z.object({
    version: z.string().describe('API version. Example: "v63.0"'),
    sobject: z.string().describe('sObject type. Example: "Account"'),
    externalIdFieldName: z.string().describe('External ID field name. Example: "External_Id__c"'),
    records: z.array(RecordSchema).min(1).describe('Array of records to upsert'),
    allOrNone: z.boolean().optional().describe('Whether to treat all records as a single transaction')
});

const ResultSchema = z.object({
    id: z.string().optional().describe('Record ID'),
    success: z.boolean().describe('Whether the operation succeeded'),
    created: z.boolean().optional().describe('Whether a new record was created'),
    errors: z.array(z.object({}).passthrough()).optional().describe('Error details if operation failed')
});

const OutputSchema = z.object({
    results: z.array(ResultSchema).describe('Results for each record in the request')
});

const action = createAction({
    description: 'Upsert multiple records using external IDs in one collection request',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/upsert-sobject-collection',
        group: 'sObject Collections'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_composite_sobjects_collections_upsert.htm
            endpoint: `/services/data/${encodeURIComponent(input.version)}/composite/sobjects/${encodeURIComponent(input.sobject)}/${encodeURIComponent(input.externalIdFieldName)}`,
            data: {
                records: input.records,
                ...(input.allOrNone !== undefined && { allOrNone: input.allOrNone })
            },
            retries: 10
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'no_data',
                message: 'No data returned from Salesforce'
            });
        }

        const results = z.array(ResultSchema).parse(response.data);

        return {
            results
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
