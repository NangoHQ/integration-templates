import { createSync } from 'nango';
import { z } from 'zod';

// Provider schemas for raw ClickUp API responses
const ClickUpSpaceSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ClickUpFolderSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ClickUpListSchema = z.object({
    id: z.string(),
    name: z.string(),
    content: z.string().optional().nullable(),
    status: z
        .object({
            status: z.string().optional(),
            color: z.string().optional(),
            hide_label: z.boolean().optional()
        })
        .optional()
        .nullable(),
    priority: z
        .object({
            priority: z.string(),
            color: z.string()
        })
        .optional()
        .nullable(),
    assignee: z
        .object({
            id: z.number().optional(),
            username: z.string().optional(),
            color: z.string().optional(),
            email: z.string().optional(),
            profilePicture: z.string().optional()
        })
        .optional()
        .nullable(),
    task_count: z.number().optional(),
    due_date: z.string().optional().nullable(),
    start_date: z.string().optional().nullable(),
    folder: z
        .object({
            id: z.string(),
            name: z.string(),
            hidden: z.boolean().optional(),
            access: z.boolean().optional()
        })
        .optional()
        .nullable(),
    space: z.object({
        id: z.string(),
        name: z.string()
    }),
    statuses: z
        .array(
            z.object({
                status: z.string(),
                color: z.string(),
                orderindex: z.number(),
                type: z.string()
            })
        )
        .optional(),
    inbound_address: z.string().optional(),
    archived: z.boolean().optional(),
    override_statuses: z.boolean().optional(),
    permission_level: z.string().optional()
});

// Normalized model for the sync
const ListSchema = z.object({
    id: z.string(),
    name: z.string(),
    space_id: z.string(),
    space_name: z.string().optional(),
    folder_id: z.string().optional(),
    folder_name: z.string().optional(),
    content: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    assignee_id: z.number().optional(),
    task_count: z.number().optional(),
    due_date: z.string().optional(),
    start_date: z.string().optional(),
    archived: z.boolean().optional(),
    inbound_address: z.string().optional()
});

type ClickUpList = z.infer<typeof ClickUpListSchema>;

const MetadataSchema = z.object({
    team_id: z.string()
});

const sync = createSync({
    description: 'Sync lists from ClickUp',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        List: ListSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/lists'
        }
    ],

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        if (!metadata?.team_id) {
            throw new Error('Missing required metadata: team_id');
        }
        const teamId = metadata.team_id;

        // Blocker: ClickUp lists have no updated_at field, so we must do a full refresh.
        // We'll use trackDeletesStart/trackDeletesEnd to detect deletions.
        await nango.trackDeletesStart('List');

        const allLists: Array<z.infer<typeof ListSchema>> = [];

        // First, get all spaces in the team
        // https://developer.clickup.com/reference/getspaces
        const spacesResponse = await nango.get({
            endpoint: `/api/v2/team/${encodeURIComponent(teamId)}/space`,
            retries: 3
        });

        const spacesResult = z
            .object({
                spaces: z.array(ClickUpSpaceSchema)
            })
            .safeParse(spacesResponse.data);

        if (!spacesResult.success) {
            throw new Error(`Failed to parse spaces response: ${spacesResult.error.message}`);
        }

        const spaces = spacesResult.data.spaces;

        // Process each space to get folderless lists and folder-based lists
        for (const space of spaces) {
            // Get folderless lists in this space
            // https://developer.clickup.com/reference/getfolderlesslists
            const folderlessResponse = await nango.get({
                endpoint: `/api/v2/space/${encodeURIComponent(space.id)}/list`,
                params: {
                    archived: 'false'
                },
                retries: 3
            });

            const folderlessResult = z
                .object({
                    lists: z.array(ClickUpListSchema)
                })
                .safeParse(folderlessResponse.data);

            if (!folderlessResult.success) {
                throw new Error(`Failed to parse folderless lists response: ${folderlessResult.error.message}`);
            }

            for (const list of folderlessResult.data.lists) {
                allLists.push(normalizeList(list));
            }

            // Get folders in this space to fetch folder-based lists
            // https://developer.clickup.com/reference/getfolders
            const foldersResponse = await nango.get({
                endpoint: `/api/v2/space/${encodeURIComponent(space.id)}/folder`,
                params: {
                    archived: 'false'
                },
                retries: 3
            });

            const foldersResult = z
                .object({
                    folders: z.array(ClickUpFolderSchema)
                })
                .safeParse(foldersResponse.data);

            if (!foldersResult.success) {
                throw new Error(`Failed to parse folders response: ${foldersResult.error.message}`);
            }

            const folders = foldersResult.data.folders;

            // Get lists for each folder
            for (const folder of folders) {
                // https://developer.clickup.com/reference/getlists
                const folderListsResponse = await nango.get({
                    endpoint: `/api/v2/folder/${encodeURIComponent(folder.id)}/list`,
                    params: {
                        archived: 'false'
                    },
                    retries: 3
                });

                const folderListsResult = z
                    .object({
                        lists: z.array(ClickUpListSchema)
                    })
                    .safeParse(folderListsResponse.data);

                if (!folderListsResult.success) {
                    throw new Error(`Failed to parse folder lists response: ${folderListsResult.error.message}`);
                }

                for (const list of folderListsResult.data.lists) {
                    allLists.push(normalizeList(list));
                }
            }
        }

        // Batch save all lists
        if (allLists.length > 0) {
            await nango.batchSave(allLists, 'List');
        }

        // Mark the end of deletion tracking - any lists not saved in this run will be marked deleted
        await nango.trackDeletesEnd('List');
    }
});

function normalizeList(list: ClickUpList): z.infer<typeof ListSchema> {
    return {
        id: list.id,
        name: list.name,
        space_id: list.space.id,
        space_name: list.space.name,
        folder_id: list.folder?.id,
        folder_name: list.folder?.name,
        content: list.content ?? undefined,
        status: list.status?.status,
        priority: list.priority?.priority,
        assignee_id: list.assignee?.id,
        task_count: list.task_count,
        due_date: list.due_date ?? undefined,
        start_date: list.start_date ?? undefined,
        archived: list.archived,
        inbound_address: list.inbound_address
    };
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
