import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    locationId: z.string().describe('HighLevel location ID. Example: "AYg6rIXHN1fXdXjGcYvI"')
});

const InputSchema = z.object({
    fieldId: z.string().describe('Custom field ID or field key. Example: "bYZ1vIZOgp0qJUrqmkb2"')
});

const ProviderCustomFieldSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    fieldKey: z.string().optional(),
    placeholder: z.string().optional(),
    dataType: z.string().optional(),
    position: z.number().optional(),
    picklistOptions: z.array(z.string()).optional(),
    picklistImageOptions: z.array(z.string()).optional(),
    isAllowedCustomOption: z.boolean().optional(),
    isMultiFileAllowed: z.boolean().optional(),
    maxFileLimit: z.number().optional(),
    locationId: z.string().optional(),
    model: z.enum(['contact', 'opportunity']).optional()
});

const ProviderResponseSchema = z.object({
    customField: ProviderCustomFieldSchema
});

const OutputSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    fieldKey: z.string().optional(),
    placeholder: z.string().optional(),
    dataType: z.string().optional(),
    position: z.number().optional(),
    picklistOptions: z.array(z.string()).optional(),
    picklistImageOptions: z.array(z.string()).optional(),
    isAllowedCustomOption: z.boolean().optional(),
    isMultiFileAllowed: z.boolean().optional(),
    maxFileLimit: z.number().optional(),
    locationId: z.string().optional(),
    model: z.enum(['contact', 'opportunity']).optional()
});

const action = createAction({
    description: 'Retrieve a single custom field from HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['locations/customFields.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.parse(rawMetadata);
        const locationId = metadata.locationId;

        const response = await nango.get({
            // https://github.com/GoHighLevel/highlevel-api-docs/blob/main/apps/locations.json
            endpoint: `/locations/${encodeURIComponent(locationId)}/customFields/${encodeURIComponent(input.fieldId)}`,
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Custom field not found',
                fieldId: input.fieldId
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const field = providerResponse.customField;

        return {
            id: field.id,
            name: field.name,
            ...(field.fieldKey !== undefined && { fieldKey: field.fieldKey }),
            ...(field.placeholder !== undefined && { placeholder: field.placeholder }),
            ...(field.dataType !== undefined && { dataType: field.dataType }),
            ...(field.position !== undefined && { position: field.position }),
            ...(field.picklistOptions !== undefined && { picklistOptions: field.picklistOptions }),
            ...(field.picklistImageOptions !== undefined && { picklistImageOptions: field.picklistImageOptions }),
            ...(field.isAllowedCustomOption !== undefined && { isAllowedCustomOption: field.isAllowedCustomOption }),
            ...(field.isMultiFileAllowed !== undefined && { isMultiFileAllowed: field.isMultiFileAllowed }),
            ...(field.maxFileLimit !== undefined && { maxFileLimit: field.maxFileLimit }),
            ...(field.locationId !== undefined && { locationId: field.locationId }),
            ...(field.model !== undefined && { model: field.model })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
