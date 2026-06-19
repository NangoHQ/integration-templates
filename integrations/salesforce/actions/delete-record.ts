import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sobject: z.string().describe('The type of sObject to delete. Example: "Account", "Contact", "Opportunity"'),
    recordId: z.string().describe('The Salesforce record ID to delete. Example: "0015000000VALDtAAP"'),
    apiVersion: z.string().optional().describe('API version to use. Defaults to "v63.0".')
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string()
});

const action = createAction({
    description: 'Delete a Salesforce sObject record by type and record ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const version = input.apiVersion || 'v63.0';
        const encodedSobject = encodeURIComponent(input.sobject);
        const encodedRecordId = encodeURIComponent(input.recordId);

        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_sobject_retrieve.htm
        await nango.delete({
            endpoint: `/services/data/${version}/sobjects/${encodedSobject}/${encodedRecordId}`,
            retries: 3
        });

        return {
            success: true,
            message: `Successfully deleted ${input.sobject} record with ID ${input.recordId}`
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
