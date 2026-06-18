import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sObject: z.string().describe('The name of the sObject to describe. Example: "Account"'),
    apiVersion: z.string().optional().describe('API version to use. Example: "v58.0". If not provided, uses the connection default.')
});

const FieldSchema = z.object({
    name: z.string(),
    label: z.string(),
    type: z.string(),
    length: z.number().optional(),
    required: z.boolean().optional(),
    referenceTo: z.array(z.string()).optional(),
    relationshipName: z.string().nullable().optional()
});

const ChildRelationshipSchema = z.object({
    childSObject: z.string().optional(),
    field: z.string().optional(),
    relationshipName: z.string().nullable().optional()
});

const RecordTypeInfoSchema = z.object({
    recordTypeId: z.string(),
    name: z.string(),
    active: z.boolean(),
    available: z.boolean()
});

const ProviderDescribeSchema = z.object({
    name: z.string(),
    label: z.string(),
    labelPlural: z.string(),
    fields: z.array(FieldSchema),
    childRelationships: z.array(ChildRelationshipSchema).optional(),
    recordTypeInfos: z.array(RecordTypeInfoSchema).optional(),
    queryable: z.boolean().optional(),
    createable: z.boolean().optional(),
    updateable: z.boolean().optional(),
    deletable: z.boolean().optional()
});

const OutputSchema = z.object({
    name: z.string(),
    label: z.string(),
    labelPlural: z.string(),
    fields: z.array(
        z.object({
            name: z.string(),
            label: z.string(),
            type: z.string(),
            length: z.number().optional(),
            required: z.boolean().optional(),
            referenceTo: z.array(z.string()).optional(),
            relationshipName: z.string().optional()
        })
    ),
    childRelationships: z
        .array(
            z.object({
                childSObject: z.string().optional(),
                field: z.string().optional(),
                relationshipName: z.string().optional()
            })
        )
        .optional(),
    recordTypeInfos: z
        .array(
            z.object({
                recordTypeId: z.string(),
                name: z.string(),
                active: z.boolean(),
                available: z.boolean()
            })
        )
        .optional(),
    queryable: z.boolean().optional(),
    createable: z.boolean().optional(),
    updateable: z.boolean().optional(),
    deletable: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve schema metadata for a specific sObject type',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const apiVersion = input.apiVersion || 'v58.0';
        const encodedSObject = encodeURIComponent(input.sObject);

        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_sobject_describe.htm
        const response = await nango.get({
            endpoint: `/services/data/${apiVersion}/sobjects/${encodedSObject}/describe`,
            retries: 3
        });

        const providerData = ProviderDescribeSchema.parse(response.data);

        return {
            name: providerData.name,
            label: providerData.label,
            labelPlural: providerData.labelPlural,
            fields: providerData.fields.map((field) => ({
                name: field.name,
                label: field.label,
                type: field.type,
                ...(field.length !== undefined && { length: field.length }),
                ...(field.required !== undefined && { required: field.required }),
                ...(field.referenceTo !== undefined && { referenceTo: field.referenceTo }),
                ...(field.relationshipName !== undefined && field.relationshipName !== null && { relationshipName: field.relationshipName })
            })),
            ...(providerData.childRelationships !== undefined && {
                childRelationships: providerData.childRelationships.map((rel) => ({
                    ...(rel.childSObject !== undefined && { childSObject: rel.childSObject }),
                    ...(rel.field !== undefined && { field: rel.field }),
                    ...(rel.relationshipName !== undefined && rel.relationshipName !== null && { relationshipName: rel.relationshipName })
                }))
            }),
            ...(providerData.recordTypeInfos !== undefined && {
                recordTypeInfos: providerData.recordTypeInfos.map((rti) => ({
                    recordTypeId: rti.recordTypeId,
                    name: rti.name,
                    active: rti.active,
                    available: rti.available
                }))
            }),
            ...(providerData.queryable !== undefined && { queryable: providerData.queryable }),
            ...(providerData.createable !== undefined && { createable: providerData.createable }),
            ...(providerData.updateable !== undefined && { updateable: providerData.updateable }),
            ...(providerData.deletable !== undefined && { deletable: providerData.deletable })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
