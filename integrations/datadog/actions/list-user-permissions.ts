import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The ID of the user. Example: "b8b30a2e-fdce-46d6-aef0-63ccf6155094"')
});

const PermissionAttributesSchema = z
    .object({
        name: z.string().optional(),
        display_name: z.string().optional(),
        description: z.string().optional(),
        group_name: z.string().optional(),
        display_type: z.string().optional(),
        restricted: z.boolean().optional()
    })
    .passthrough();

const PermissionSchema = z
    .object({
        type: z.string(),
        id: z.string(),
        attributes: PermissionAttributesSchema.optional()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        data: z.array(PermissionSchema),
        meta: z
            .object({
                page: z
                    .object({
                        total_count: z.number().optional(),
                        total_filtered_count: z.number().optional()
                    })
                    .optional()
            })
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    permissions: z.array(PermissionSchema),
    total_count: z.number().optional()
});

const action = createAction({
    description: 'List the effective permissions a user has (aggregated from their assigned roles).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.datadoghq.com/api/latest/users/#get-a-user-permission
        const response = await nango.get({
            endpoint: `v2/users/${encodeURIComponent(input.userId)}/permissions`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User permissions not found',
                userId: input.userId
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            permissions: providerResponse.data,
            ...(providerResponse.meta?.page?.total_count !== undefined && { total_count: providerResponse.meta.page.total_count })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
