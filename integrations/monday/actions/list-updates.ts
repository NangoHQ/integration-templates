import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of updates to return per page. Default: 25. Maximum: 100.'),
    from_date: z.string().optional().describe('Start of date range filter in ISO 8601 format. Must be used with to_date.'),
    to_date: z.string().optional().describe('End of date range filter in ISO 8601 format. Must be used with from_date.')
});

const ProviderCreatorSchema = z
    .object({
        id: z.string().nullish(),
        name: z.string().nullish()
    })
    .nullish();

const ProviderReplySchema = z.object({
    id: z.string(),
    body: z.string().nullish(),
    text_body: z.string().nullish(),
    created_at: z.string().nullish(),
    creator: ProviderCreatorSchema
});

const ProviderUpdateSchema = z.object({
    id: z.string(),
    body: z.string().nullish(),
    text_body: z.string().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish(),
    creator: ProviderCreatorSchema,
    replies: z.array(ProviderReplySchema).nullish(),
    item_id: z.string().nullish()
});

const OutputUpdateSchema = z.object({
    id: z.string(),
    body: z.string().optional(),
    text_body: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    creator: z
        .object({
            id: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    replies: z
        .array(
            z.object({
                id: z.string(),
                body: z.string().optional(),
                text_body: z.string().optional(),
                created_at: z.string().optional(),
                creator: z
                    .object({
                        id: z.string().optional(),
                        name: z.string().optional()
                    })
                    .optional()
            })
        )
        .optional(),
    item_id: z.string().optional()
});

const OutputSchema = z.object({
    updates: z.array(OutputUpdateSchema),
    next_cursor: z.string().optional()
});

const MondayResponseSchema = z.object({
    data: z
        .object({
            updates: z.array(z.unknown()).optional()
        })
        .optional(),
    errors: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'List updates from monday.com.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-updates',
        group: 'Updates'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['updates:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if ((input.from_date !== undefined && input.to_date === undefined) || (input.to_date !== undefined && input.from_date === undefined)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'from_date and to_date must be provided together'
            });
        }

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (input.cursor && (Number.isNaN(page) || !/^\d+$/.test(input.cursor) || page < 1)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer string'
            });
        }

        const variables: Record<string, unknown> = {
            page: page
        };
        if (input.limit !== undefined) {
            variables['limit'] = input.limit;
        }
        if (input.from_date !== undefined) {
            variables['from_date'] = input.from_date;
        }
        if (input.to_date !== undefined) {
            variables['to_date'] = input.to_date;
        }

        const query = `
            query ($limit: Int, $page: Int, $from_date: String, $to_date: String) {
                updates(limit: $limit, page: $page, from_date: $from_date, to_date: $to_date) {
                    id
                    body
                    text_body
                    created_at
                    updated_at
                    creator {
                        id
                        name
                    }
                    replies {
                        id
                        body
                        text_body
                        created_at
                        creator {
                            id
                            name
                        }
                    }
                    item_id
                }
            }
        `;

        // https://developer.monday.com/api-reference/reference/updates
        const response = await nango.post({
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query: query,
                variables: variables
            },
            retries: 3
        });

        const parsedResponse = MondayResponseSchema.parse(response.data);

        if (parsedResponse.errors !== undefined && parsedResponse.errors.length > 0) {
            const firstError = parsedResponse.errors[0];
            const message =
                firstError !== null && typeof firstError === 'object' && 'message' in firstError && typeof firstError.message === 'string'
                    ? firstError.message
                    : 'GraphQL error';
            throw new nango.ActionError({
                type: 'graphql_error',
                message: message,
                details: parsedResponse.errors
            });
        }

        const rawUpdates = parsedResponse.data?.updates;
        if (!rawUpdates) {
            return {
                updates: []
            };
        }

        const updates = rawUpdates.map((raw) => ProviderUpdateSchema.parse(raw));
        const effectiveLimit = input.limit ?? 25;
        const hasMore = updates.length === effectiveLimit && updates.length > 0;
        const next_cursor = hasMore ? String(page + 1) : undefined;

        return {
            updates: updates.map((update) => {
                const mappedUpdate: z.infer<typeof OutputUpdateSchema> = {
                    id: update.id
                };

                if (update.body !== null && update.body !== undefined) {
                    mappedUpdate.body = update.body;
                }
                if (update.text_body !== null && update.text_body !== undefined) {
                    mappedUpdate.text_body = update.text_body;
                }
                if (update.created_at !== null && update.created_at !== undefined) {
                    mappedUpdate.created_at = update.created_at;
                }
                if (update.updated_at !== null && update.updated_at !== undefined) {
                    mappedUpdate.updated_at = update.updated_at;
                }
                if (update.creator !== null && update.creator !== undefined) {
                    mappedUpdate.creator = {};
                    if (update.creator.id !== null && update.creator.id !== undefined) {
                        mappedUpdate.creator.id = update.creator.id;
                    }
                    if (update.creator.name !== null && update.creator.name !== undefined) {
                        mappedUpdate.creator.name = update.creator.name;
                    }
                    if (Object.keys(mappedUpdate.creator).length === 0) {
                        delete mappedUpdate.creator;
                    }
                }
                if (update.replies !== null && update.replies !== undefined) {
                    mappedUpdate.replies = update.replies.map((reply) => {
                        const mappedReply: {
                            id: string;
                            body?: string;
                            text_body?: string;
                            created_at?: string;
                            creator?: { id?: string; name?: string };
                        } = {
                            id: reply.id
                        };
                        if (reply.body !== null && reply.body !== undefined) {
                            mappedReply.body = reply.body;
                        }
                        if (reply.text_body !== null && reply.text_body !== undefined) {
                            mappedReply.text_body = reply.text_body;
                        }
                        if (reply.created_at !== null && reply.created_at !== undefined) {
                            mappedReply.created_at = reply.created_at;
                        }
                        if (reply.creator !== null && reply.creator !== undefined) {
                            mappedReply.creator = {};
                            if (reply.creator.id !== null && reply.creator.id !== undefined) {
                                mappedReply.creator.id = reply.creator.id;
                            }
                            if (reply.creator.name !== null && reply.creator.name !== undefined) {
                                mappedReply.creator.name = reply.creator.name;
                            }
                            if (Object.keys(mappedReply.creator).length === 0) {
                                delete mappedReply.creator;
                            }
                        }
                        return mappedReply;
                    });
                }
                if (update.item_id !== null && update.item_id !== undefined) {
                    mappedUpdate.item_id = update.item_id;
                }

                return mappedUpdate;
            }),
            ...(next_cursor !== undefined && { next_cursor: next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
