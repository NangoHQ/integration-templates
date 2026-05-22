import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    board_id: z.string().describe('The board ID to list groups from. Example: "5096980653"'),
    ids: z.array(z.string()).optional().describe('Optional group IDs to filter by.')
});

const ProviderGroupSchema = z.object({
    id: z.string(),
    title: z.string(),
    color: z.string().optional(),
    position: z.string().optional(),
    archived: z.boolean().optional(),
    deleted: z.boolean().optional()
});

const OutputSchema = z.object({
    groups: z.array(
        z.object({
            id: z.string(),
            title: z.string(),
            color: z.string().optional(),
            position: z.string().optional(),
            archived: z.boolean().optional(),
            deleted: z.boolean().optional()
        })
    )
});

const action = createAction({
    description: 'List groups from monday.com.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-groups',
        group: 'Groups'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!/^\d+$/.test(input.board_id)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'board_id must be a numeric string'
            });
        }

        const boardId = input.board_id;
        const groupIds = input.ids;

        const groupIdsArg = groupIds && groupIds.length > 0 ? `ids: [${groupIds.map((id) => `"${id}"`).join(',')}]` : '';

        const query = `
            query {
                boards(ids: ${boardId}) {
                    groups${groupIdsArg ? `(${groupIdsArg})` : ''} {
                        id
                        title
                        color
                        position
                        archived
                        deleted
                    }
                }
            }
        `;

        const config: ProxyConfiguration = {
            // https://developer.monday.com/api-reference/reference/groups
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query
            },
            retries: 3
        };

        const response = await nango.post(config);

        const ResponseSchema = z.object({
            data: z
                .object({
                    boards: z
                        .array(
                            z.object({
                                groups: z.array(z.unknown()).optional()
                            })
                        )
                        .optional()
                })
                .optional(),
            errors: z.unknown().optional()
        });

        const parsed = ResponseSchema.parse(response.data);

        if (parsed.errors) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Monday GraphQL returned errors',
                details: parsed.errors
            });
        }

        const rawGroups = parsed.data?.boards?.[0]?.groups || [];

        const groups = rawGroups.map((group) => {
            const parsed = ProviderGroupSchema.parse(group);

            return {
                id: parsed.id,
                title: parsed.title,
                ...(parsed.color !== undefined && { color: parsed.color }),
                ...(parsed.position !== undefined && { position: parsed.position }),
                ...(parsed.archived !== undefined && { archived: parsed.archived }),
                ...(parsed.deleted !== undefined && { deleted: parsed.deleted })
            };
        });

        return {
            groups
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
