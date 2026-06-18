import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sObject: z.string().describe('The sObject type (e.g., Account, Contact, CustomObject__c). Example: "Account"'),
    externalIdField: z.string().describe('The API name of the external ID field. Example: "customExtIdField__c"'),
    externalId: z.string().describe('The external ID value to look up. Example: "ext-123"'),
    fields: z.record(z.string(), z.unknown()).describe('The field values to update on the record. Example: { "Name": "Acme Corp", "Phone": "555-1234" }')
});

const OutputSchema = z.object({
    id: z.string().optional().describe('The Salesforce ID of the updated record. Only returned if the record was created (when updateOnly is false).'),
    updated: z.boolean().describe('Whether the record was successfully updated.'),
    created: z.boolean().optional().describe('Whether a new record was created (only when updateOnly is false and record did not exist).')
});

const action = createAction({
    description: 'Update a record by external ID field and value.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_sobject_upsert.htm
        const response = await nango.patch({
            endpoint: `/services/data/v59.0/sobjects/${encodeURIComponent(input.sObject)}/${encodeURIComponent(input.externalIdField)}/${encodeURIComponent(input.externalId)}`,
            params: {
                updateOnly: 'true'
            },
            data: input.fields,
            retries: 3
        });

        // When updateOnly=true and record exists: HTTP 204 No Content with empty body
        if (response.status === 204) {
            return {
                updated: true
            };
        }

        // Handle unexpected response with data
        if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
            const data = response.data;
            const id = 'id' in data && typeof data.id === 'string' ? data.id : undefined;
            const success = 'success' in data && typeof data.success === 'boolean' ? data.success : undefined;
            return {
                ...(id !== undefined && { id }),
                updated: success === true,
                created: false
            };
        }

        return {
            updated: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
