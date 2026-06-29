import { createSync } from 'nango';
import { z } from 'zod';

const CustomFieldSchema = z.object({
    id: z.string(),
    fieldId: z.string(),
    name: z.string(),
    type: z.string(),
    required: z.string().optional(),
    show: z.string().optional(),
    value: z.string().optional(),
    listItems: z.array(z.string()).optional()
});

const MetadataSchema = z.object({
    accountId: z.string()
});

const TextCustomFieldSchema = z.object({
    fieldId: z.string(),
    name: z.string(),
    required: z.string().optional(),
    show: z.string().optional(),
    value: z.string().optional()
});

const ListCustomFieldSchema = z.object({
    fieldId: z.string(),
    name: z.string(),
    listItems: z.array(z.string()).optional(),
    required: z.string().optional(),
    show: z.string().optional(),
    value: z.string().optional()
});

const CustomFieldsResponseSchema = z.object({
    textCustomFields: z.array(TextCustomFieldSchema).optional(),
    listCustomFields: z.array(ListCustomFieldSchema).optional()
});

const sync = createSync({
    description: 'Sync account-level custom field definitions (text and list types).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    models: {
        CustomField: CustomFieldSchema
    },
    metadata: MetadataSchema,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/custom-fields'
        }
    ],
    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error('accountId is required in metadata');
        }
        const accountId = parsedMetadata.data.accountId;

        // https://developers.docusign.com/docs/esign-rest-api/reference/accounts/accountcustomfields/get/
        const response = await nango.get({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/custom_fields`,
            retries: 3
        });

        const parsedResponse = CustomFieldsResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new Error(`Failed to parse custom fields response: ${parsedResponse.error.message}`);
        }

        const textFields = parsedResponse.data.textCustomFields ?? [];
        const listFields = parsedResponse.data.listCustomFields ?? [];

        const customFields = [
            ...textFields.map((field) => ({
                id: field.fieldId,
                fieldId: field.fieldId,
                name: field.name,
                type: 'text',
                ...(field.required !== undefined && { required: field.required }),
                ...(field.show !== undefined && { show: field.show }),
                ...(field.value !== undefined && { value: field.value })
            })),
            ...listFields.map((field) => ({
                id: field.fieldId,
                fieldId: field.fieldId,
                name: field.name,
                type: 'list',
                ...(field.required !== undefined && { required: field.required }),
                ...(field.show !== undefined && { show: field.show }),
                ...(field.value !== undefined && { value: field.value }),
                ...(field.listItems !== undefined && { listItems: field.listItems })
            }))
        ];

        await nango.trackDeletesStart('CustomField');
        await nango.batchSave(customFields, 'CustomField');
        await nango.trackDeletesEnd('CustomField');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
