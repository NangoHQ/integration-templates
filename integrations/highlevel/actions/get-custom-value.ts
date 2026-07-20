import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    locationId: z.string().describe('Location ID. Example: "ve9EPM428h8vShlRW1KT"'),
    id: z.string().describe('Custom Value ID. Example: "rWQ709Pb62syqGLceg1x"')
});

const ProviderCustomValueSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    fieldKey: z.string().optional(),
    value: z.string().optional(),
    locationId: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    fieldKey: z.string().optional(),
    value: z.string().optional(),
    locationId: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single custom value from HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['locations/customValues.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://github.com/GoHighLevel/highlevel-api-docs/blob/main/apps/locations.json
            endpoint: `/locations/${encodeURIComponent(input.locationId)}/customValues/${encodeURIComponent(input.id)}`,
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Custom value not found.',
                id: input.id
            });
        }

        const parsedResponse = z
            .object({
                customValue: ProviderCustomValueSchema
            })
            .safeParse(response.data);

        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_provider_response',
                message: 'Unexpected provider response shape.',
                details: parsedResponse.error.issues
            });
        }

        const customValue = parsedResponse.data.customValue;

        return {
            id: customValue.id,
            ...(customValue.name !== undefined && { name: customValue.name }),
            ...(customValue.fieldKey !== undefined && { fieldKey: customValue.fieldKey }),
            ...(customValue.value !== undefined && { value: customValue.value }),
            ...(customValue.locationId !== undefined && { locationId: customValue.locationId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
