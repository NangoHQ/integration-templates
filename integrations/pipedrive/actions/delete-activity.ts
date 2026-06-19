import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The ID of the activity to delete. Example: 8')
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        id: z.number()
    })
});

const OutputSchema = z.object({
    id: z.number(),
    success: z.boolean().optional()
});

const action = createAction({
    description: 'Delete or archive a activity in Pipedrive.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input) => {
        const response = await nango.delete({
            // https://developers.pipedrive.com/docs/api/v1/Activities#deleteActivity
            endpoint: `/v1/activities/${input.id}`,
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.data.id,
            success: providerResponse.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
