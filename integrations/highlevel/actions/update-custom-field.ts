import { z } from 'zod';
import { createAction } from 'nango';

const TextBoxListOptionSchema = z.object({
    label: z.string().optional(),
    prefillValue: z.string().optional()
});

const InputSchema = z.object({
    locationId: z.string().describe('Location ID. Example: "ve9EPM428h8vShlRW1KT"'),
    id: z.string().describe('Custom Field ID. Example: "00NhGCcN1tlO8ZHcu7Wb"'),
    name: z.string().describe('Field name. Example: "Custom Field"'),
    placeholder: z.string().optional().describe('Placeholder text for the field'),
    acceptedFormat: z.array(z.string()).optional().describe('Allowed file formats for uploads'),
    isMultipleFile: z.boolean().optional().describe('Whether multiple files are allowed'),
    maxNumberOfFiles: z.number().optional().describe('Maximum number of files allowed'),
    textBoxListOptions: z.array(TextBoxListOptionSchema).optional().describe('Options for textbox_list fields'),
    position: z.number().optional().describe('Position of the field'),
    model: z.enum(['contact', 'opportunity']).optional().describe('Model of the custom field')
});

const ProviderCustomFieldSchema = z.object({
    id: z.string(),
    name: z.string(),
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
    model: z.string().optional()
});

const ProviderResponseSchema = z.object({
    customField: ProviderCustomFieldSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
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
    model: z.string().optional()
});

const action = createAction({
    description: 'Update a custom field in HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['locations/customFields.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            name: input.name
        };

        if (input.placeholder !== undefined) {
            data['placeholder'] = input.placeholder;
        }
        if (input.acceptedFormat !== undefined) {
            data['acceptedFormat'] = input.acceptedFormat;
        }
        if (input.isMultipleFile !== undefined) {
            data['isMultipleFile'] = input.isMultipleFile;
        }
        if (input.maxNumberOfFiles !== undefined) {
            data['maxNumberOfFiles'] = input.maxNumberOfFiles;
        }
        if (input.textBoxListOptions !== undefined) {
            data['textBoxListOptions'] = input.textBoxListOptions;
        }
        if (input.position !== undefined) {
            data['position'] = input.position;
        }
        if (input.model !== undefined) {
            data['model'] = input.model;
        }

        const response = await nango.put({
            // https://marketplace.gohighlevel.com/docs/ghl/locations/update-custom-field
            endpoint: `/locations/${encodeURIComponent(input.locationId)}/customFields/${encodeURIComponent(input.id)}`,
            headers: {
                Version: '2021-07-28'
            },
            data,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response shape',
                details: parsed.error.issues
            });
        }

        const field = parsed.data.customField;

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
