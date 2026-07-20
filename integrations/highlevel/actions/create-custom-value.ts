import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the custom value. Example: "welcome_message"'),
    value: z.string().describe('Value of the custom value. Example: "Hello World"'),
    locationId: z.string().optional().describe('Location ID. If omitted, the action reads it from the connection configuration.')
});

const ConnectionConfigSchema = z.object({
    locationId: z.string()
});

const ProviderCustomValueSchema = z.object({
    id: z.string(),
    name: z.string(),
    fieldKey: z.string(),
    value: z.string(),
    locationId: z.string()
});

const ProviderResponseSchema = z.object({
    customValue: ProviderCustomValueSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    fieldKey: z.string(),
    value: z.string(),
    locationId: z.string()
});

const action = createAction({
    description: 'Create a location-level custom value (a named merge variable, distinct from a per-contact custom field).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['locations/customValues.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let locationId: string;

        if (input.locationId) {
            locationId = input.locationId;
        } else {
            const connection = await nango.getConnection();
            const parsedConfig = ConnectionConfigSchema.safeParse(connection.connection_config);
            if (!parsedConfig.success) {
                throw new nango.ActionError({
                    type: 'invalid_connection_config',
                    message: 'locationId is missing from the connection configuration.'
                });
            }
            locationId = parsedConfig.data.locationId;
        }

        const response = await nango.post({
            // https://highlevel.stoplight.io/docs/integrations/Create-Custom-Value
            endpoint: `/locations/${encodeURIComponent(locationId)}/customValues`,
            headers: {
                Version: '2021-07-28'
            },
            data: {
                name: input.name,
                value: input.value
            },
            retries: 1
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The API returned an unexpected response format.',
                details: parsedResponse.error.message
            });
        }

        return {
            id: parsedResponse.data.customValue.id,
            name: parsedResponse.data.customValue.name,
            fieldKey: parsedResponse.data.customValue.fieldKey,
            value: parsedResponse.data.customValue.value,
            locationId: parsedResponse.data.customValue.locationId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
