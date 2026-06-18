import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    key: z.string().describe('The unique identifier of the component set.')
});

const HttpErrorSchema = z.object({
    status: z.number().optional(),
    payload: z
        .object({
            status: z.number().optional(),
            err: z.string().optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    status: z.number(),
    error: z.boolean(),
    meta: z.object({
        key: z.string(),
        file_key: z.string(),
        node_id: z.string(),
        thumbnail_url: z.string().optional().nullable(),
        name: z.string(),
        description: z.string(),
        created_at: z.string(),
        updated_at: z.string(),
        user: z
            .object({
                id: z.string(),
                handle: z.string().optional().nullable(),
                img_url: z.string().optional().nullable()
            })
            .passthrough(),
        containing_frame: z
            .object({
                nodeId: z.string().optional().nullable(),
                name: z.string().optional().nullable(),
                backgroundColor: z.string().optional().nullable(),
                pageId: z.string(),
                pageName: z.string(),
                containingStateGroup: z
                    .object({
                        nodeId: z.string().optional().nullable(),
                        name: z.string().optional().nullable()
                    })
                    .optional()
                    .nullable(),
                containingComponentSet: z
                    .object({
                        nodeId: z.string().optional().nullable(),
                        name: z.string().optional().nullable()
                    })
                    .optional()
                    .nullable()
            })
            .optional()
            .nullable()
    })
});

const OutputSchema = z.object({
    key: z.string(),
    file_key: z.string(),
    node_id: z.string(),
    thumbnail_url: z.string().optional(),
    name: z.string(),
    description: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    user: z.object({
        id: z.string(),
        handle: z.string().optional(),
        img_url: z.string().optional()
    }),
    containing_frame: z
        .object({
            nodeId: z.string().optional(),
            name: z.string().optional(),
            backgroundColor: z.string().optional(),
            pageId: z.string(),
            pageName: z.string(),
            containingStateGroup: z
                .object({
                    nodeId: z.string().optional(),
                    name: z.string().optional()
                })
                .optional(),
            containingComponentSet: z
                .object({
                    nodeId: z.string().optional(),
                    name: z.string().optional()
                })
                .optional()
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve a single component set from Figma.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['library_assets:read', 'files:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;

        // @allowTryCatch: Convert known HTTP errors into ActionError so callers receive a structured response instead of a raw script HTTP error.
        try {
            // https://www.figma.com/developers/api#get-component-set-endpoint
            response = await nango.get({
                endpoint: `/v1/component_sets/${encodeURIComponent(input.key)}`,
                retries: 3
            });
        } catch (error) {
            const parsedError = HttpErrorSchema.safeParse(error);
            if (parsedError.success) {
                const httpStatus = parsedError.data.status ?? parsedError.data.payload?.status;
                if (httpStatus === 404 || httpStatus === 403) {
                    throw new nango.ActionError({
                        type: 'not_found',
                        message: 'Component set not found or access denied',
                        key: input.key
                    });
                }
            }
            throw error;
        }

        if (response.data?.error === true) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Component set not found',
                key: input.key
            });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Figma API',
                details: parsed.error.issues
            });
        }

        const meta = parsed.data.meta;

        const normalizeUser = (user: z.infer<typeof ProviderResponseSchema>['meta']['user']) => ({
            id: user.id,
            ...(user.handle != null && { handle: user.handle }),
            ...(user.img_url != null && { img_url: user.img_url })
        });

        const normalizeFrame = (frame: NonNullable<z.infer<typeof ProviderResponseSchema>['meta']['containing_frame']>) => ({
            ...(frame.nodeId != null && { nodeId: frame.nodeId }),
            ...(frame.name != null && { name: frame.name }),
            ...(frame.backgroundColor != null && { backgroundColor: frame.backgroundColor }),
            pageId: frame.pageId,
            pageName: frame.pageName,
            ...(frame.containingStateGroup != null && {
                containingStateGroup: {
                    ...(frame.containingStateGroup.nodeId != null && {
                        nodeId: frame.containingStateGroup.nodeId
                    }),
                    ...(frame.containingStateGroup.name != null && {
                        name: frame.containingStateGroup.name
                    })
                }
            }),
            ...(frame.containingComponentSet != null && {
                containingComponentSet: {
                    ...(frame.containingComponentSet.nodeId != null && {
                        nodeId: frame.containingComponentSet.nodeId
                    }),
                    ...(frame.containingComponentSet.name != null && {
                        name: frame.containingComponentSet.name
                    })
                }
            })
        });

        return {
            key: meta.key,
            file_key: meta.file_key,
            node_id: meta.node_id,
            ...(meta.thumbnail_url != null && { thumbnail_url: meta.thumbnail_url }),
            name: meta.name,
            description: meta.description,
            created_at: meta.created_at,
            updated_at: meta.updated_at,
            user: normalizeUser(meta.user),
            ...(meta.containing_frame != null && {
                containing_frame: normalizeFrame(meta.containing_frame)
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
