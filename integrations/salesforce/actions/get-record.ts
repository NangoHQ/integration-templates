import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sObject: z.string().describe('The Salesforce object type. Example: "Account", "Contact", "Opportunity"'),
    recordId: z.string().describe('The Salesforce record ID. Example: "001D000000INjVe"'),
    fields: z.array(z.string()).optional().describe('Optional list of fields to retrieve. If omitted, all accessible fields are returned.')
});

const ProviderResponseSchema = z.object({}).passthrough();

const action = createAction({
    description: 'Retrieve a Salesforce record by object type and record ID',
    version: '1.0.1',
    input: InputSchema,
    output: ProviderResponseSchema,

    exec: async (nango, input) => {
        // Build the fields query parameter if provided
        const params: Record<string, string> = {};
        if (input.fields && input.fields.length > 0) {
            params['fields'] = input.fields.join(',');
        }

        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_sobject_retrieve_get.htm
        const response = await nango.get({
            endpoint: `/services/data/v62.0/sobjects/${encodeURIComponent(input.sObject)}/${encodeURIComponent(input.recordId)}`,
            params,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Record not found for ${input.sObject} with ID ${input.recordId}`,
                sObject: input.sObject,
                recordId: input.recordId
            });
        }

        const validated = ProviderResponseSchema.parse(response.data);
        return validated;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
