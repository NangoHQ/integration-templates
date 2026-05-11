import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    api_version: z.string().optional().describe('API version to use. Example: "v63.0". Defaults to v63.0 if not provided.'),
    sobject: z.string().describe('The sObject type to update. Example: "Account", "Contact", "Opportunity".'),
    record_id: z.string().describe('The Salesforce record ID to update. Example: "0015000000XYZABC".'),
    fields: z.record(z.string(), z.unknown()).describe('Fields to update on the record. Only provided fields will be updated.')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the update was successful.'),
    errors: z.array(z.string()).optional().describe('Error messages if the update failed.')
});

const action = createAction({
    description: 'Partially update a Salesforce record by object type and record ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-record',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api', 'refresh_token'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const version = input.api_version || 'v63.0';
        const encodedSobject = encodeURIComponent(input.sobject);
        const encodedRecordId = encodeURIComponent(input.record_id);

        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_sobject_upsert_patch.htm
        const response = await nango.patch({
            endpoint: `/services/data/${version}/sobjects/${encodedSobject}/${encodedRecordId}`,
            data: input.fields,
            retries: 10
        });

        // Salesforce returns 204 No Content on successful update
        if (response.status === 204) {
            return {
                success: true
            };
        }

        // Handle error responses
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
            const errors = response.data.map((err) => {
                if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
                    return err.message;
                }
                return 'Unknown error';
            });
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Failed to update Salesforce record',
                errors,
                sobject: input.sobject,
                record_id: input.record_id
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
