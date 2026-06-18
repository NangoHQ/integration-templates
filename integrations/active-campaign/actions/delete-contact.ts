import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('The contact ID to delete. Example: 9')
});

const ProviderResponseSchema = z.object({
    message: z.string().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.number().int().describe('The deleted contact ID')
});

const action = createAction({
    description: 'Permanently delete a contact in ActiveCampaign.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.activecampaign.com/reference/delete-contact
        const response = await nango.delete({
            endpoint: `/3/contacts/${encodeURIComponent(String(input.id))}`,
            retries: 1
        });

        ProviderResponseSchema.parse(response.data);

        return {
            success: true,
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
