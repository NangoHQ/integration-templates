import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Custom Value ID. Example: "2hBP4dogy4o8sA86rQLw"'),
    locationId: z.string().describe('Location ID. Example: "AYg6rIXHN1fXdXjGcYvI"'),
    name: z.string().describe('Name of the custom value. Example: "Nango Test CV"'),
    value: z.string().describe('Value of the custom value. Example: "Updated Value"')
});

const ProviderResponseSchema = z.object({
    customValue: z.object({
        id: z.string(),
        name: z.string().optional(),
        fieldKey: z.string().optional(),
        value: z.string().optional(),
        locationId: z.string().optional()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    fieldKey: z.string().optional(),
    value: z.string().optional(),
    locationId: z.string().optional()
});

const action = createAction({
    description: 'Update a custom value in HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['locations/customValues.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://highlevel.stoplight.io/docs/integrations/
            endpoint: `/locations/${encodeURIComponent(input.locationId)}/customValues/${encodeURIComponent(input.id)}`,
            headers: {
                Version: '2021-07-28'
            },
            data: {
                name: input.name,
                value: input.value
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from HighLevel API'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const cv = providerResponse.customValue;

        return {
            id: cv.id,
            ...(cv.name != null && { name: cv.name }),
            ...(cv.fieldKey != null && { fieldKey: cv.fieldKey }),
            ...(cv.value != null && { value: cv.value }),
            ...(cv.locationId != null && { locationId: cv.locationId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
