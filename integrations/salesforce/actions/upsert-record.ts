import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sObject: z.string().describe('The Salesforce sObject type (e.g., Account, Contact, Lead).'),
    external_id_field: z.string().describe('The name of the external ID field on the sObject (e.g., External_ID__c).'),
    external_id: z.string().describe('The external ID value to upsert.'),
    record_data: z.record(z.string(), z.unknown()).describe('The field data for the record to upsert.'),
    api_version: z.string().optional().describe('Salesforce API version (e.g., "v60.0"). Defaults to v60.0.')
});

const ErrorDetailSchema = z.object({
    statusCode: z.string(),
    fields: z.array(z.string()).optional(),
    message: z.string()
});

const OutputSchema = z.object({
    id: z.string().optional().describe('The ID of the created or updated record.'),
    success: z.boolean().describe('Whether the operation was successful.'),
    created: z.boolean().optional().describe('True if the record was created, false if updated.'),
    errors: z.array(ErrorDetailSchema).optional().describe('Error details if the operation failed.')
});

const action = createAction({
    description: 'Create or update a Salesforce record using an external ID field.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/upsert-record',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const apiVersion = encodeURIComponent(input.api_version || 'v60.0');
        const sObject = encodeURIComponent(input.sObject);
        const externalIdField = encodeURIComponent(input.external_id_field);
        const externalId = encodeURIComponent(input.external_id);

        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_sobject_upsert.htm
        const response = await nango.patch({
            endpoint: `/services/data/${apiVersion}/sobjects/${sObject}/${externalIdField}/${externalId}`,
            data: input.record_data,
            retries: 3
        });

        if (response.status >= 400) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Salesforce API returned an error',
                status: response.status,
                data: response.data
            });
        }

        const data = response.data ?? {};
        return {
            success: true,
            ...(data.id && { id: data.id }),
            ...(data.created !== undefined && { created: data.created })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
