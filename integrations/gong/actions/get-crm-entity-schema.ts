import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    integrationId: z.string().describe('The CRM integration ID. Example: "6286478263646"'),
    entityType: z.string().describe('The CRM entity type to retrieve schema fields for. Example: "ACCOUNT"')
});

const ProviderFieldSchema = z.object({
    name: z.string().nullish(),
    uniqueName: z.string().nullish(),
    label: z.string().nullable(),
    type: z.string().nullable(),
    lastModified: z.string().nullish(),
    isDeleted: z.boolean().nullable(),
    referenceTo: z.string().nullish(),
    orderedValueList: z.array(z.string()).nullish()
});

const ProviderResponseSchema = z.object({
    requestId: z.string(),
    objectTypeToSelectedFields: z.record(z.string(), z.array(ProviderFieldSchema)).nullable()
});

const OutputFieldSchema = z.object({
    name: z.string().nullish(),
    uniqueName: z.string().nullish(),
    label: z.string().nullable(),
    type: z.string().nullable(),
    lastModified: z.string().nullish(),
    isDeleted: z.boolean().nullable(),
    referenceTo: z.string().nullish(),
    orderedValueList: z.array(z.string()).nullish()
});

const OutputSchema = z.object({
    requestId: z.string(),
    objectTypeToSelectedFields: z.record(z.string(), z.array(OutputFieldSchema)).nullable()
});

const action = createAction({
    description: 'List CRM entity schema fields registered in Gong',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:crm:schema'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {
            objectType: input.entityType
        };
        if (input.integrationId !== undefined) {
            params['integrationId'] = input.integrationId;
        }

        // https://help.gong.io/apidocs/list-schema-fields-v2crmentity-schema-1
        // @allowTryCatch The CRM entity schema endpoint is plan-gated and may return 401 or 404 on standard accounts.
        // We treat this as a valid empty result rather than a hard failure.
        try {
            const response = await nango.get({
                endpoint: '/v2/crm/entity-schema',
                params,
                retries: 3
            });

            if (typeof response.status === 'number' && (response.status === 401 || response.status === 404)) {
                return {
                    requestId: '',
                    objectTypeToSelectedFields: {}
                };
            }

            const providerResponse = ProviderResponseSchema.parse(response.data);

            if (providerResponse.objectTypeToSelectedFields === null) {
                return {
                    requestId: providerResponse.requestId,
                    objectTypeToSelectedFields: null
                };
            }

            const objectTypeToSelectedFields: Record<string, z.infer<typeof OutputFieldSchema>[]> = {};

            for (const [objectType, fields] of Object.entries(providerResponse.objectTypeToSelectedFields)) {
                objectTypeToSelectedFields[objectType] = fields.map((field) => {
                    const mapped: z.infer<typeof OutputFieldSchema> = {
                        label: field.label,
                        type: field.type,
                        isDeleted: field.isDeleted
                    };

                    if (field.name !== undefined) {
                        mapped.name = field.name;
                    }
                    if (field.uniqueName !== undefined) {
                        mapped.uniqueName = field.uniqueName;
                    }
                    if (field.lastModified !== null && field.lastModified !== undefined) {
                        mapped.lastModified = field.lastModified;
                    }
                    if (field.referenceTo !== null && field.referenceTo !== undefined) {
                        mapped.referenceTo = field.referenceTo;
                    }
                    if (field.orderedValueList !== null && field.orderedValueList !== undefined) {
                        mapped.orderedValueList = field.orderedValueList;
                    }

                    return mapped;
                });
            }

            return {
                requestId: providerResponse.requestId,
                objectTypeToSelectedFields
            };
        } catch (error) {
            if (error !== null && typeof error === 'object') {
                const response = Reflect.get(error, 'response');
                if (response !== null && typeof response === 'object') {
                    const status = Reflect.get(response, 'status');
                    if (typeof status === 'number' && (status === 401 || status === 404)) {
                        return {
                            requestId: '',
                            objectTypeToSelectedFields: {}
                        };
                    }
                }
            }
            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
