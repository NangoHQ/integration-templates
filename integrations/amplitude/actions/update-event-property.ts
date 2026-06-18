import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    event_property: z.string().describe('Name of the event property to update. Example: "Completed Task"'),
    event_type: z.string().optional().describe('Name of the event type the event property belongs to. Example: "Onboard Start"'),
    override_scope: z
        .enum(['override', 'shared'])
        .optional()
        .describe('Determines how Amplitude acts on this event property. Only applicable when event_type is present.'),
    new_event_property_value: z.string().optional().describe('The new name of the event property.'),
    description: z.string().optional().describe("The event property's description."),
    type: z.enum(['string', 'number', 'boolean', 'enum', 'any']).optional().describe("The event property's data type."),
    regex: z.string().optional().describe('Regular expression for pattern matching. Only applicable to the string type.'),
    enum_values: z.string().optional().describe('List of allowed values, separated by comma. Only applicable to the enum type.'),
    is_array_type: z.boolean().optional().describe('Specifies whether the property value is an array.'),
    is_required: z.boolean().optional().describe('Marks the property as required.'),
    is_hidden: z.boolean().optional().describe('Hide the property from chart dropdowns.'),
    classifications: z
        .string()
        .optional()
        .describe('List of classifications applicable to this event property, separated by comma. Valid classifications are PII, SENSITIVE, and REVENUE.')
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    errors: z
        .array(
            z.object({
                message: z.string()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the update succeeded.')
});

const action = createAction({
    description: 'Update an event property in taxonomy.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = new URLSearchParams();

        if (input.event_type !== undefined) {
            body.append('event_type', input.event_type);
        }
        if (input.override_scope !== undefined) {
            body.append('overrideScope', input.override_scope);
        }
        if (input.new_event_property_value !== undefined) {
            body.append('new_event_property_value', input.new_event_property_value);
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

        const config: ProxyConfiguration = {
            // https://amplitude.com/docs/apis/analytics/taxonomy
            endpoint: `/api/2/taxonomy/event-property/${encodeURIComponent(input.event_property)}`,
            data: body.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 3
        };

        let response;
        // @allowTryCatch Catch non-2xx proxy errors and map them to a consistent ActionError.
        try {
            response = await nango.put(config);
        } catch {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Failed to update event property.'
            });
        }
        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.success) {
            const messages = providerResponse.errors?.map((e) => e.message).join(', ') ?? 'Unknown error';
            throw new nango.ActionError({
                type: 'update_failed',
                message: messages
            });
        }

        return {
            success: providerResponse.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
