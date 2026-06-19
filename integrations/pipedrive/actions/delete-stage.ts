import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The ID of the stage to delete. Example: 13')
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    data: z
        .object({
            id: z.number().optional()
        })
        .passthrough()
        .optional()
        .nullable()
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.number().optional()
});

const action = createAction({
    description: 'Delete or archive a stage in Pipedrive.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deals:full'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.pipedrive.com/docs/api/v1/Stages#deleteStage
            endpoint: `/v1/stages/${input.id}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete stage ${input.id}`,
                id: input.id
            });
        }

        return {
            success: providerResponse.success,
            ...(providerResponse.data?.id !== undefined && { id: providerResponse.data.id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
