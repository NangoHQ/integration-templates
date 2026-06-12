import { z } from 'zod';
import { createAction } from 'nango';

const FieldTypeSchema = z.enum([
    'DATE',
    'DATETIME',
    'NUMBER',
    'PERCENT',
    'CURRENCY',
    'ID',
    'URL',
    'STRING',
    'BOOLEAN',
    'PHONENUMBER',
    'EMAILADDRESS',
    'PICKLIST',
    'REFERENCE',
    'STRINGARRAY'
]);

const ReferenceToSchema = z.enum(['ACCOUNT', 'CONTACT', 'DEAL', 'LEAD', 'USER']);

const FieldSchema = z.object({
    uniqueName: z.string().describe('The unique name of the field in the CRM system. Example: "accountowner"'),
    label: z.string().describe('The label to use in the UI for this field. Example: "Account Owner"'),
    type: FieldTypeSchema.describe('The field type (case-sensitive). Must be one of the supported types.'),
    lastModified: z
        .string()
        .optional()
        .describe('The date and time the schema was last modified. ISO-8601 format without milliseconds. Example: "2020-12-17T13:45:01Z"'),
    isDeleted: z.boolean().optional().describe('When true, deletes the field from the schema and its value is removed from all objects.'),
    referenceTo: ReferenceToSchema.optional().describe('The object type this field refers to. Required for field of type REFERENCE.'),
    orderedValueList: z.array(z.string()).optional().describe('The list of values for the field. Required for PICKLIST fields.')
});

const InputSchema = z.object({
    integrationId: z.string().describe('Integration ID generated when creating the integration. Example: "6286478263646"'),
    objectType: z.enum(['ACCOUNT', 'CONTACT', 'DEAL', 'LEAD']).describe('The object type to set the schema for (case-sensitive).'),
    fields: z.array(FieldSchema).describe('Array of schema field definitions to upload or update.')
});

const ProviderResponseSchema = z.object({
    requestId: z.string().describe('A Gong request reference Id, generated for this request.')
});

const OutputSchema = z.object({
    requestId: z.string().describe('A Gong request reference Id, generated for this request.')
});

const action = createAction({
    description: 'Upload or update the object schema fields for a CRM entity type in Gong.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/upload-crm-entity-schema',
        group: 'CRM'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:crm:schema'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch: Nango throws on non-2xx HTTP responses. We catch them to convert known errors into actionable ActionError messages.
        try {
            response = await nango.post({
                // https://help.gong.io/apidocs/upload-object-schema-v2crmentity-schema-1
                endpoint: '/v2/crm/entity-schema',
                params: {
                    integrationId: input.integrationId,
                    objectType: input.objectType
                },
                data: input.fields,
                retries: 1
            });
        } catch (error) {
            let status: number | undefined;
            let data: unknown;

            if (error && typeof error === 'object') {
                if ('status' in error && typeof error.status === 'number') {
                    status = error.status;
                }
                if ('response' in error && error.response && typeof error.response === 'object' && 'data' in error.response) {
                    data = error.response.data;
                }
            }

            if (status === 404) {
                throw new nango.ActionError({
                    type: 'plan_gated',
                    message: 'CRM entity schema management is not available on this account. It may require a higher-tier plan or add-on license.'
                });
            }

            if (status === 400 && data && typeof data === 'object' && 'errors' in data) {
                const errors = data.errors;
                const errorArray = Array.isArray(errors) ? errors : [];
                const errorMessages: string[] = [];
                for (const e of errorArray) {
                    if (typeof e === 'string') {
                        errorMessages.push(e);
                    }
                }
                throw new nango.ActionError({
                    type: 'bad_request',
                    message: errorMessages.join(', '),
                    errors: errorMessages
                });
            }

            throw new nango.ActionError({
                type: 'api_error',
                message: 'Unexpected response from Gong API',
                status: status,
                data: data
            });
        }

        if (response.status !== 200 && response.status !== 201) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Unexpected response from Gong API',
                status: response.status,
                data: response.data
            });
        }

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse Gong API response',
                details: providerResponse.error.message
            });
        }

        return {
            requestId: providerResponse.data.requestId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
