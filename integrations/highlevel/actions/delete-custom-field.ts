import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fieldId: z.string().describe('Custom field ID. Example: "bYZ1vIZOgp0qJUrqmkb2"'),
    locationId: z.string().optional().describe('Location ID. Defaults to the connection config locationId.')
});

const ProviderDeleteResponseSchema = z.object({
    succeded: z.boolean(),
    traceId: z.string().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    fieldId: z.string()
});

const ConnectionConfigSchema = z.object({
    locationId: z.string()
});

const action = createAction({
    description: 'Delete a custom field in HighLevel.',
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
                    type: 'invalid_connection',
                    message: 'locationId is required in connection config or input.'
                });
            }

            locationId = configParse.data.locationId;
        }

        // https://highlevel.stoplight.io/docs/integrations/custom-fields
        const response = await nango.delete({
            endpoint: `/locations/${encodeURIComponent(locationId)}/customFields/${encodeURIComponent(input.fieldId)}`,
            headers: {
                Version: '2021-07-28'
            },
            retries: 1
        });

        const providerResponse = ProviderDeleteResponseSchema.parse(response.data);

        return {
            success: providerResponse.succeded,
            fieldId: input.fieldId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
