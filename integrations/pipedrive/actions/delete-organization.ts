import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The ID of the organization to delete. Example: 9')
});

const ProviderDeleteResponseSchema = z.object({
    success: z.boolean(),
    data: z
        .object({
            id: z.number()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.number(),
    deleted: z.boolean().optional(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive a organization in Pipedrive.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-organization',
        group: 'Organizations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.pipedrive.com/docs/api/v1/Organizations#deleteOrganization
            endpoint: `/v1/organizations/${input.id}`,
            retries: 1
        });

        const providerResponse = ProviderDeleteResponseSchema.parse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Failed to delete organization',
                organization_id: input.id
            });
        }

        return {
            id: providerResponse.data?.id ?? input.id,
            deleted: true,
            message: 'Organization marked as deleted. It will be permanently deleted after 30 days.'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
