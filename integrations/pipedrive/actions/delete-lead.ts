import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the lead to delete. Example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"')
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({}).passthrough().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.string()
});

const action = createAction({
    description: 'Delete or archive a lead in Pipedrive.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pipedrive.com/docs/api/v1/Leads#deleteLead
        const response = await nango.delete({
            endpoint: `/v1/leads/${input.id}`,
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Failed to delete lead',
                id: input.id
            });
        }

        return {
            success: true,
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
