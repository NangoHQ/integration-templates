import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    locationId: z.string().describe('HighLevel location (sub-account) ID. Example: "AYg6rIXHN1fXdXjGcYvI"')
});

const CustomValueSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    fieldKey: z.string().optional(),
    value: z.string().optional(),
    locationId: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(CustomValueSchema)
});

const action = createAction({
    description: 'List location-level custom values from HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['locations/customValues.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://highlevel.stoplight.io/docs/integrations/
            endpoint: `/locations/${encodeURIComponent(input.locationId)}/customValues`,
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected empty response from HighLevel.'
            });
        }

        const providerResponseSchema = z.object({
            customValues: z.array(CustomValueSchema)
        });

        const parsedResponse = providerResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from HighLevel.'
            });
        }
        const providerResponse = parsedResponse.data;

        return {
            items: providerResponse.customValues.map((item) => ({
                id: item.id,
                ...(item.name !== undefined && { name: item.name }),
                ...(item.fieldKey !== undefined && { fieldKey: item.fieldKey }),
                ...(item.value !== undefined && { value: item.value }),
                ...(item.locationId !== undefined && { locationId: item.locationId })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
