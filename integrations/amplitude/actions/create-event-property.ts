import { z } from 'zod';
import { createAction } from 'nango';
import { URLSearchParams } from 'url';

const InputSchema = z.object({
    event_property: z.string().describe('Name of the event property. Example: "Completed Task"'),
    event_type: z.string().optional().describe('Name of the event type the event property belongs to. Example: "Onboard Start"'),
    description: z.string().optional().describe("The event property's description."),
    type: z
        .enum(['string', 'number', 'boolean', 'enum', 'any'])
        .optional()
        .describe("The event property's data type. Acceptable values are string, number, boolean, enum, and any."),
    regex: z.string().optional().describe('Regular expression for pattern matching. Only applicable to the string type.'),
    enum_values: z.string().optional().describe('List of allowed values separated by comma. Only applicable to the enum type.'),
    is_array_type: z.boolean().optional().describe('Use the type parameter to set the type of array elements.'),
    is_required: z.boolean().optional().describe('Marks the property as required.'),
    is_hidden: z.boolean().optional().describe('Hide the property from chart dropdowns.'),
    classifications: z.string().optional().describe('List of classifications applicable to this event property. Valid values are PII, SENSITIVE, REVENUE.')
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    errors: z.array(z.object({ message: z.string() })).optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    event_property: z.string(),
    event_type: z.string().optional()
});

const action = createAction({
    description: 'Create an event property in taxonomy.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = new URLSearchParams();
        body.append('event_property', input.event_property);
        if (input.event_type !== undefined) {
            body.append('event_type', input.event_type);
        }
        if (input.description !== undefined) {
            body.append('description', input.description);
        }
        if (input.type !== undefined) {
            body.append('type', input.type);
        }
        if (input.regex !== undefined) {
            body.append('regex', input.regex);
        }
        if (input.enum_values !== undefined) {
            body.append('enum_values', input.enum_values);
        }
        if (input.is_array_type !== undefined) {
            body.append('is_array_type', String(input.is_array_type));
        }
        if (input.is_required !== undefined) {
            body.append('is_required', String(input.is_required));
        }
        if (input.is_hidden !== undefined) {
            body.append('is_hidden', String(input.is_hidden));
        }
        if (input.classifications !== undefined) {
            body.append('classifications', input.classifications);
        }

        const response = await nango.post({
            // https://amplitude.com/docs/apis/analytics/taxonomy#create-an-event-property
            endpoint: '/api/2/taxonomy/event-property',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: body.toString(),
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.success) {
            const errors = providerResponse.errors?.map((e) => e.message).join(', ') || 'Unknown error';
            throw new nango.ActionError({
                type: 'provider_error',
                message: errors
            });
        }

        return {
            success: providerResponse.success,
            event_property: input.event_property,
            event_type: input.event_type
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
