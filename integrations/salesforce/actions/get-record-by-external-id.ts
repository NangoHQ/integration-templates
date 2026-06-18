import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    version: z.string().optional().describe('API version. Example: "v60.0". If omitted, defaults to the connection\'s configured version.'),
    sobject: z.string().describe('sObject API name. Example: "Account", "Contact", "CustomObject__c".'),
    external_id_field: z.string().describe('External ID field name. Example: "External_ID__c", "Custom_External_Id__c".'),
    external_id: z.string().describe('External ID value to retrieve. Example: "EXT-12345".'),
    fields: z
        .array(z.string())
        .optional()
        .describe('Fields to return in the response. If omitted, all fields are returned. Example: ["Id", "Name", "CreatedDate"]')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Salesforce record ID (18-character).'),
        attributes: z
            .object({
                type: z.string(),
                url: z.string()
            })
            .optional()
    })
    .passthrough()
    .describe('Record fields including Id and attributes');

const action = createAction({
    description: 'Retrieve a record by external ID field and value.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedVersion = encodeURIComponent(input.version || 'v60.0');
        const encodedSobject = encodeURIComponent(input.sobject);
        const encodedExternalIdField = encodeURIComponent(input.external_id_field);
        const encodedExternalId = encodeURIComponent(input.external_id);

        const endpoint = `/services/data/${encodedVersion}/sobjects/${encodedSobject}/${encodedExternalIdField}/${encodedExternalId}`;

        const params: Record<string, string | string[]> = {};
        if (input.fields && input.fields.length > 0) {
            params['fields'] = input.fields.join(',');
        }

        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_sobject_upsert_get.htm
        const response = await nango.get({
            endpoint: endpoint,
            params: params,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Record not found',
                sobject: input.sobject,
                external_id_field: input.external_id_field,
                external_id: input.external_id
            });
        }

        if (typeof response.data !== 'object' || response.data === null) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Response data is not an object'
            });
        }

        const record = response.data;

        const id = record['Id'];
        if (!id || typeof id !== 'string') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Response missing required Id field'
            });
        }

        return {
            id: id,
            ...record
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
