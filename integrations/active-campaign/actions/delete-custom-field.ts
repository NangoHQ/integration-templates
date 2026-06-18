import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The ID of the custom field to delete. Example: 1')
});

const ProviderResponseSchema = z.object({
    message: z.string().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Delete a contact custom field from ActiveCampaign.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.activecampaign.com/reference/delete-a-custom-field
            endpoint: `/3/fields/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            success: true,
            ...(providerData.message !== undefined && { message: providerData.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
