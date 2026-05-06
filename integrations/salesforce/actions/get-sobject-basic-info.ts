import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sObject: z.string().describe('The name of the sObject to retrieve metadata for. Example: "Account"'),
    apiVersion: z.string().optional().describe('Optional API version to use. Defaults to "v63.0". Example: "v60.0"')
});

const FieldSchema = z
    .object({
        name: z.string(),
        label: z.string(),
        type: z.string(),
        length: z.number().optional(),
        updateable: z.boolean().optional(),
        createable: z.boolean().optional(),
        custom: z.boolean().optional(),
        nillable: z.boolean().optional()
    })
    .passthrough();

const UrlsSchema = z
    .object({
        sobject: z.string().optional(),
        describe: z.string().optional(),
        rowTemplate: z.string().optional(),
        uiEditTemplate: z.string().optional(),
        uiDetailTemplate: z.string().optional()
    })
    .passthrough();

const ObjectDescribeSchema = z
    .object({
        name: z.string(),
        label: z.string(),
        labelPlural: z.string().optional(),
        keyPrefix: z.string().optional(),
        updateable: z.boolean().optional(),
        createable: z.boolean().optional(),
        deletable: z.boolean().optional(),
        queryable: z.boolean().optional(),
        custom: z.boolean().optional(),
        urls: UrlsSchema.optional(),
        fields: z.array(FieldSchema).optional()
    })
    .passthrough();

const RecentItemSchema = z
    .object({
        Id: z.string(),
        Name: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    objectDescribe: ObjectDescribeSchema,
    recentItems: z.array(RecentItemSchema).optional()
});

const OutputSchema = z.object({
    name: z.string().describe('The API name of the sObject.'),
    label: z.string().describe('The display label for the sObject.'),
    labelPlural: z.string().optional().describe('The plural display label for the sObject.'),
    keyPrefix: z.string().optional().describe('The key prefix for record IDs of this type.'),
    updateable: z.boolean().optional().describe('Whether records of this type can be updated.'),
    createable: z.boolean().optional().describe('Whether records of this type can be created.'),
    deletable: z.boolean().optional().describe('Whether records of this type can be deleted.'),
    queryable: z.boolean().optional().describe('Whether records of this type can be queried.'),
    custom: z.boolean().optional().describe('Whether this is a custom object.'),
    urls: z
        .object({
            sobject: z.string().optional().describe('URL for the sObject resource.'),
            describe: z.string().optional().describe('URL for the describe resource.'),
            rowTemplate: z.string().optional().describe('URL template for accessing a specific record.'),
            uiEditTemplate: z.string().optional().describe('URL template for editing a record in the UI.'),
            uiDetailTemplate: z.string().optional().describe('URL template for viewing a record in the UI.')
        })
        .optional(),
    fields: z
        .array(
            z.object({
                name: z.string().describe('The API name of the field.'),
                label: z.string().describe('The display label for the field.'),
                type: z.string().describe('The data type of the field.'),
                length: z.number().optional().describe('The maximum length of the field.'),
                updateable: z.boolean().optional().describe('Whether the field can be updated.'),
                createable: z.boolean().optional().describe('Whether the field can be set on create.'),
                custom: z.boolean().optional().describe('Whether this is a custom field.'),
                nillable: z.boolean().optional().describe('Whether the field allows null values.')
            })
        )
        .optional()
        .describe('Metadata for fields defined on this sObject.'),
    recentItems: z
        .array(
            z.object({
                id: z.string().describe('Record ID of the recent item.'),
                name: z.string().optional().describe('Name or primary field value of the recent item.')
            })
        )
        .optional()
        .describe('Recently accessed records of this type.')
});

const action = createAction({
    description: 'Retrieve basic metadata for a specific sObject type including object properties, recent items, and URIs for related resources.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-sobject-basic-info',
        group: 'Metadata'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api', 'refresh_token'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const apiVersion = input.apiVersion || 'v63.0';
        const encodedSObject = encodeURIComponent(input.sObject);

        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_sobject_basic_info.htm
        const response = await nango.get({
            endpoint: `/services/data/${apiVersion}/sobjects/${encodedSObject}/`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `sObject "${input.sObject}" not found or API version "${apiVersion}" is not supported.`
            });
        }

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            name: providerData.objectDescribe.name,
            label: providerData.objectDescribe.label,
            ...(providerData.objectDescribe.labelPlural !== undefined && {
                labelPlural: providerData.objectDescribe.labelPlural
            }),
            ...(providerData.objectDescribe.keyPrefix !== undefined && {
                keyPrefix: providerData.objectDescribe.keyPrefix
            }),
            ...(providerData.objectDescribe.updateable !== undefined && {
                updateable: providerData.objectDescribe.updateable
            }),
            ...(providerData.objectDescribe.createable !== undefined && {
                createable: providerData.objectDescribe.createable
            }),
            ...(providerData.objectDescribe.deletable !== undefined && {
                deletable: providerData.objectDescribe.deletable
            }),
            ...(providerData.objectDescribe.queryable !== undefined && {
                queryable: providerData.objectDescribe.queryable
            }),
            ...(providerData.objectDescribe.custom !== undefined && {
                custom: providerData.objectDescribe.custom
            }),
            ...(providerData.objectDescribe.urls !== undefined && {
                urls: {
                    ...(providerData.objectDescribe.urls.sobject !== undefined && {
                        sobject: providerData.objectDescribe.urls.sobject
                    }),
                    ...(providerData.objectDescribe.urls.describe !== undefined && {
                        describe: providerData.objectDescribe.urls.describe
                    }),
                    ...(providerData.objectDescribe.urls.rowTemplate !== undefined && {
                        rowTemplate: providerData.objectDescribe.urls.rowTemplate
                    }),
                    ...(providerData.objectDescribe.urls.uiEditTemplate !== undefined && {
                        uiEditTemplate: providerData.objectDescribe.urls.uiEditTemplate
                    }),
                    ...(providerData.objectDescribe.urls.uiDetailTemplate !== undefined && {
                        uiDetailTemplate: providerData.objectDescribe.urls.uiDetailTemplate
                    })
                }
            }),
            ...(providerData.objectDescribe.fields !== undefined && {
                fields: providerData.objectDescribe.fields.map((field) => ({
                    name: field.name,
                    label: field.label,
                    type: field.type,
                    ...(field.length !== undefined && { length: field.length }),
                    ...(field.updateable !== undefined && { updateable: field.updateable }),
                    ...(field.createable !== undefined && { createable: field.createable }),
                    ...(field.custom !== undefined && { custom: field.custom }),
                    ...(field.nillable !== undefined && { nillable: field.nillable })
                }))
            }),
            ...(providerData.recentItems !== undefined && {
                recentItems: providerData.recentItems.map((item) => ({
                    id: item.Id,
                    ...(item.Name !== undefined && { name: item.Name })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
