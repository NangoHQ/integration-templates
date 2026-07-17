import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    model: z.enum(['contact', 'opportunity', 'all']).optional().describe('Model of the custom field to filter by. Example: "contact"')
});

const ProviderCustomFieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    fieldKey: z.string(),
    placeholder: z.string().optional(),
    dataType: z.string(),
    position: z.number().optional(),
    picklistOptions: z.array(z.string()).optional(),
    picklistImageOptions: z.array(z.string()).optional(),
    isAllowedCustomOption: z.boolean().optional(),
    isMultiFileAllowed: z.boolean().optional(),
    maxFileLimit: z.number().optional(),
    locationId: z.string(),
    model: z.string().optional()
});

const ProviderResponseSchema = z.object({
    customFields: z.array(ProviderCustomFieldSchema)
});

const CustomFieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    fieldKey: z.string(),
    placeholder: z.string().optional(),
    dataType: z.string(),
    position: z.number().optional(),
    picklistOptions: z.array(z.string()).optional(),
    picklistImageOptions: z.array(z.string()).optional(),
    isAllowedCustomOption: z.boolean().optional(),
    isMultiFileAllowed: z.boolean().optional(),
    maxFileLimit: z.number().optional(),
    locationId: z.string(),
    model: z.string().optional()
});

const OutputSchema = z.object({
    customFields: z.array(CustomFieldSchema)
});

const action = createAction({
    description: 'List custom fields from HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['locations/customFields.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ locationId?: string }>();
        const locationId = metadata?.locationId;

        if (!locationId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'locationId is required in metadata.'
            });
        }

        const response = await nango.get({
            // https://highlevel.stoplight.io/docs/integrations/Custom%20Field/get-custom-fields
            endpoint: `/locations/${encodeURIComponent(locationId)}/customFields`,
            params: {
                ...(input.model !== undefined && { model: input.model })
            },
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            customFields: providerResponse.customFields.map((field) => ({
                id: field.id,
                name: field.name,
                fieldKey: field.fieldKey,
                ...(field.placeholder !== undefined && { placeholder: field.placeholder }),
                dataType: field.dataType,
                ...(field.position !== undefined && { position: field.position }),
                ...(field.picklistOptions !== undefined && { picklistOptions: field.picklistOptions }),
                ...(field.picklistImageOptions !== undefined && { picklistImageOptions: field.picklistImageOptions }),
                ...(field.isAllowedCustomOption !== undefined && { isAllowedCustomOption: field.isAllowedCustomOption }),
                ...(field.isMultiFileAllowed !== undefined && { isMultiFileAllowed: field.isMultiFileAllowed }),
                ...(field.maxFileLimit !== undefined && { maxFileLimit: field.maxFileLimit }),
                locationId: field.locationId,
                ...(field.model !== undefined && { model: field.model })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
