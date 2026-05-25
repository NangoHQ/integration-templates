import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const GroupSchema = z.object({
    id: z.string(),
    board_id: z.string(),
    title: z.string().optional(),
    color: z.string().optional(),
    position: z.string().optional(),
    archived: z.boolean().optional(),
    deleted: z.boolean().optional()
});

const BoardSchema = z.object({
    id: z.union([z.string(), z.number()]),
    groups: z.array(z.unknown()).optional()
});

const GroupResponseSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    color: z.string().optional(),
    position: z.string().optional(),
    archived: z.boolean().optional(),
    deleted: z.boolean().optional()
});

const sync = createSync({
    description: 'Sync groups from monday.com',
    version: '1.0.0',
    endpoints: [
        // https://developer.monday.com/api-reference/reference/groups
        { method: 'GET', path: '/syncs/groups' }
    ],
    frequency: 'every hour',
    autoStart: true,
    models: {
        Group: GroupSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('Group');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.monday.com/api-reference/reference/groups
            endpoint: '/v2',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-version': '2026-04'
            },
            data: {
                query: `query ($page: Int!, $limit: Int!) {
                    boards(limit: $limit, page: $page) {
                        id
                        groups {
                            id
                            title
                            color
                            position
                            archived
                            deleted
                        }
                    }
                }`,
                variables: {
                    page: 1,
                    limit: 25
                }
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'variables.page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'variables.limit',
                limit: 25,
                response_path: 'data.boards'
            },
            retries: 3
        };

        for await (const boardBatch of nango.paginate(proxyConfig)) {
            const parsedBoards = z.array(z.unknown()).safeParse(boardBatch);
            if (!parsedBoards.success) {
                throw new Error(`Failed to parse boards batch: ${parsedBoards.error.message}`);
            }

            const groups: z.infer<typeof GroupSchema>[] = [];

            for (const board of parsedBoards.data) {
                const parsedBoard = BoardSchema.safeParse(board);
                if (!parsedBoard.success) {
                    throw new Error(`Failed to parse board: ${parsedBoard.error.message}`);
                }

                const boardId = String(parsedBoard.data.id);
                const groupList = parsedBoard.data.groups ?? [];

                for (const group of groupList) {
                    const parsedGroup = GroupResponseSchema.safeParse(group);
                    if (!parsedGroup.success) {
                        throw new Error(`Failed to parse group: ${parsedGroup.error.message}`);
                    }

                    groups.push({
                        id: `${boardId}-${parsedGroup.data.id}`,
                        board_id: boardId,
                        ...(parsedGroup.data.title != null && { title: parsedGroup.data.title }),
                        ...(parsedGroup.data.color != null && { color: parsedGroup.data.color }),
                        ...(parsedGroup.data.position != null && { position: parsedGroup.data.position }),
                        ...(parsedGroup.data.archived != null && { archived: parsedGroup.data.archived }),
                        ...(parsedGroup.data.deleted != null && { deleted: parsedGroup.data.deleted })
                    });
                }
            }

            if (groups.length > 0) {
                await nango.batchSave(groups, 'Group');
            }
        }

        await nango.trackDeletesEnd('Group');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
