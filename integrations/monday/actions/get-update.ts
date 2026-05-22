import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    update_id: z.string().describe('The unique identifier of the update. Example: "579526624"')
});

const ProviderCreatorSchema = z.object({
    id: z.string(),
    name: z.string().optional().nullable()
});

const ProviderUpdateSchema = z.object({
    id: z.string(),
    body: z.string(),
    text_body: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    edited_at: z.string().optional().nullable(),
    creator_id: z.string().optional().nullable(),
    item_id: z.string().optional().nullable(),
    creator: ProviderCreatorSchema.optional().nullable()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            updates: z.array(ProviderUpdateSchema).optional().nullable()
        })
        .optional()
        .nullable(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                extensions: z
                    .object({
                        code: z.string().optional()
                    })
                    .optional()
            })
        )
        .optional()
        .nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    body: z.string(),
    text_body: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    edited_at: z.string().optional(),
    creator_id: z.string().optional(),
    item_id: z.string().optional(),
    creator: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve a single update from monday.com.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-update',
        group: 'Updates'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['updates:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.monday.com/api-reference/reference/updates
        const response = await nango.post({
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query: 'query($ids: [ID!]) { updates(ids: $ids) { id body text_body created_at updated_at edited_at creator_id item_id creator { id name } } }',
                variables: { ids: [input.update_id] }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            const firstError = providerResponse.errors[0];
            if (firstError) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: firstError.message,
                    errors: providerResponse.errors
                });
            }
        }

        const updates = providerResponse.data?.updates ?? [];
        if (updates.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Update with ID ${input.update_id} not found.`
            });
        }

        const update = updates[0];
        if (!update) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Update with ID ${input.update_id} not found.`
            });
        }

        return {
            id: update.id,
            body: update.body,
            ...(update.text_body != null && { text_body: update.text_body }),
            ...(update.created_at != null && { created_at: update.created_at }),
            ...(update.updated_at != null && { updated_at: update.updated_at }),
            ...(update.edited_at != null && { edited_at: update.edited_at }),
            ...(update.creator_id != null && { creator_id: update.creator_id }),
            ...(update.item_id != null && { item_id: update.item_id }),
            ...(update.creator != null && {
                creator: {
                    id: update.creator.id,
                    ...(update.creator.name != null && { name: update.creator.name })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
