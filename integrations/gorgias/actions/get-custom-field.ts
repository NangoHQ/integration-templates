import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the custom field definition.')
    })
    .describe('Input for retrieving a single custom field definition.');

const ProviderCustomFieldSchema = z
    .object({
        id: z.number(),
        name: z.string().nullable().optional(),
        label: z.string().nullable().optional(),
        object_type: z.string().optional(),
        type: z.string().optional(),
        deactivated_datetime: z.string().nullable().optional(),
        managed_type: z.string().nullable().optional(),
        choices: z.array(z.string()).nullable().optional(),
        created_datetime: z.string().optional(),
        updated_datetime: z.string().nullable().optional(),
        description: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the custom field definition.'),
        name: z.string().optional().describe('The internal name of the custom field.'),
        label: z.string().optional().describe('The human-readable label of the custom field.'),
        object_type: z.string().optional().describe('The object type this custom field applies to, e.g. Ticket or Customer.'),
        type: z.string().optional().describe('The data type of the custom field, e.g. text, number, choice.'),
        deactivated_datetime: z.string().optional().describe('ISO 8601 timestamp when the field was deactivated, if applicable.'),
        managed_type: z.string().optional().describe('The managed type if this field is managed by Gorgias internally, e.g. ai_intent.'),
        choices: z.array(z.string()).optional().describe('Allowed choices for choice-type custom fields.'),
        created_datetime: z.string().optional().describe('ISO 8601 timestamp when the custom field was created.'),
        updated_datetime: z.string().optional().describe('ISO 8601 timestamp when the custom field was last updated.'),
        description: z.string().optional().describe('The description of the custom field.')
    })
    .describe('A single custom field definition retrieved from Gorgias.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single custom field definition from the provider without any mutation.
 * @pitfalls: Custom field definitions cannot be deleted via the API, only deactivated, so retrieving a deactivated field returns its data with a deactivated_datetime set rather than a 404.
 */
const action = createAction({
    description: 'Retrieve a single custom field definition.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.gorgias.com/reference/get-custom-field
        const response = await nango.get({
            endpoint: `/api/custom-fields/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Custom field with id ${input.id} was not found.`
            });
        }

        const providerField = ProviderCustomFieldSchema.parse(response.data);

        return {
            id: providerField.id,
            ...(providerField.name != null && { name: providerField.name }),
            ...(providerField.label != null && { label: providerField.label }),
            ...(providerField.object_type !== undefined && { object_type: providerField.object_type }),
            ...(providerField.type !== undefined && { type: providerField.type }),
            ...(providerField.deactivated_datetime != null && { deactivated_datetime: providerField.deactivated_datetime }),
            ...(providerField.managed_type != null && { managed_type: providerField.managed_type }),
            ...(providerField.choices != null && { choices: providerField.choices }),
            ...(providerField.created_datetime !== undefined && { created_datetime: providerField.created_datetime }),
            ...(providerField.updated_datetime != null && { updated_datetime: providerField.updated_datetime }),
            ...(providerField.description != null && { description: providerField.description })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
