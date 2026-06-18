import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The ID of the deal to delete. Example: 9')
});

const ProviderDeleteResponseSchema = z.object({
    success: z.boolean().optional(),
    data: z
        .object({
            id: z.number().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.number(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete or archive a deal in Pipedrive.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deals:full'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.pipedrive.com/docs/api/v1/Deals#deleteDeal
            endpoint: `/v1/deals/${input.id}`,
            retries: 10
        });

        const parsed = ProviderDeleteResponseSchema.parse(response.data);

        if (parsed.success === false) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete deal ${input.id}`
            });
        }

        return {
            id: parsed.data?.id ?? input.id,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
