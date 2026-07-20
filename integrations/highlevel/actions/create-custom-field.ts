import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Field name. Example: "Custom Field"'),
    dataType: z.string().describe('Type of field. Example: "TEXT"'),
    model: z.enum(['contact', 'opportunity']).describe('Model of the custom field. Example: "contact"'),
    locationId: z.string().optional().describe('Location ID. Falls back to connection config if omitted.'),
    placeholder: z.string().optional().describe('Placeholder text for the field'),
    acceptedFormat: z.array(z.string()).optional().describe('Allowed file formats for uploads. Example: [".pdf", ".jpeg"]'),
    isMultipleFile: z.boolean().optional().describe('Whether multiple files are allowed'),
    maxNumberOfFiles: z.number().optional().describe('Maximum number of files allowed'),
    textBoxListOptions: z
        .array(
            z.object({
                label: z.string(),
                prefillValue: z.string().optional()
            })
        )
        .optional()
        .describe('Options for textbox list fields'),
    position: z.number().optional().describe('Position of the field. Default: 0')
});

const ProviderResponseSchema = z.object({
    customField: z.object({
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
        locationId: z.string().optional(),
        model: z.string().optional()
    })
});

const OutputSchema = z.object({
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
    locationId: z.string().optional(),
    model: z.string().optional()
});

const ConnectionConfigSchema = z.object({
    locationId: z.string()
});

const action = createAction({
    description: 'Create a custom field in HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['locations/customFields.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let locationId = input.locationId;
        if (!locationId) {
            const connection = await nango.getConnection();
            const configParse = ConnectionConfigSchema.safeParse(connection.connection_config);
            if (!configParse.success) {
                throw new nango.ActionError({
                    type: 'missing_location_id',
                    message: 'locationId is missing in input and connection configuration.'
                });
            }
            locationId = configParse.data.locationId;
        }

        const body: Record<string, unknown> = {
            name: input.name,
            dataType: input.dataType,
            model: input.model
        };
        if (input.placeholder !== undefined) {
            body['placeholder'] = input.placeholder;
        }
        if (input.acceptedFormat !== undefined) {
            body['acceptedFormat'] = input.acceptedFormat;
        }
        if (input.isMultipleFile !== undefined) {
            body['isMultipleFile'] = input.isMultipleFile;
        }
        if (input.maxNumberOfFiles !== undefined) {
            body['maxNumberOfFiles'] = input.maxNumberOfFiles;
        }
        if (input.textBoxListOptions !== undefined) {
            body['textBoxListOptions'] = input.textBoxListOptions;
        }
        if (input.position !== undefined) {
            body['position'] = input.position;
        }

        const response = await nango.post({
            // https://highlevel.stoplight.io/docs/integrations/custom-fields/create-custom-field
            endpoint: `/locations/${encodeURIComponent(locationId)}/customFields`,
            headers: {
                Version: '2021-07-28'
            },
            data: body,
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const field = providerResponse.customField;

        return {
            id: field.id,
            name: field.name,
            fieldKey: field.fieldKey,
            dataType: field.dataType,
            ...(field.placeholder != null && { placeholder: field.placeholder }),
            ...(field.position != null && { position: field.position }),
            ...(field.picklistOptions != null && { picklistOptions: field.picklistOptions }),
            ...(field.picklistImageOptions != null && { picklistImageOptions: field.picklistImageOptions }),
            ...(field.isAllowedCustomOption != null && { isAllowedCustomOption: field.isAllowedCustomOption }),
            ...(field.isMultiFileAllowed != null && { isMultiFileAllowed: field.isMultiFileAllowed }),
            ...(field.maxFileLimit != null && { maxFileLimit: field.maxFileLimit }),
            ...(field.locationId != null && { locationId: field.locationId }),
            ...(field.model != null && { model: field.model })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
