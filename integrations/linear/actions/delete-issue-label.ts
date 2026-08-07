import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    labelId: z.string().describe('The ID of the issue label to delete. Example: "b08dbaa2-5ecc-4770-acaf-23894ce84e64"')
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            issueLabelDelete: z
                .object({
                    success: z.boolean(),
                    entityId: z.string().optional(),
                    lastSyncId: z.number().optional()
                })
                .nullable()
                .optional()
        })
        .nullable()
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                extensions: z.unknown().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    entityId: z.string().optional(),
    lastSyncId: z.number().optional()
});

const action = createAction({
    description: 'Delete a Linear issue label.',
    version: '1.0.4',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://linear.app/developers
            endpoint: '/graphql',
            data: {
                query: 'mutation IssueLabelDelete($id: String!) { issueLabelDelete(id: $id) { success entityId lastSyncId } }',
                variables: { id: input.labelId }
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Linear API.'
            });
        }

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response shape from Linear API.',
                details: providerResponse.error.issues
            });
        }

        const firstError = providerResponse.data.errors?.[0];
        if (firstError) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: firstError.message
            });
        }

        const deleteResult = providerResponse.data.data?.issueLabelDelete;
        if (!deleteResult) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Issue label not found: ${input.labelId}`
            });
        }

        return {
            success: deleteResult.success,
            ...(deleteResult.entityId !== undefined && { entityId: deleteResult.entityId }),
            ...(deleteResult.lastSyncId !== undefined && { lastSyncId: deleteResult.lastSyncId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
