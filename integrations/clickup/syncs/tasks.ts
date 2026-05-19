import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// https://developer.clickup.com/reference/

// Raw provider schemas matching ClickUp API v2 response shapes
const ClickUpTaskSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    status: z
        .object({
            status: z.string(),
            color: z.string().optional().nullable(),
            type: z.string().optional()
        })
        .optional()
        .nullable(),
    orderindex: z.union([z.string(), z.number()]).optional(),
    date_created: z.string(),
    date_updated: z.string(),
    date_closed: z.string().optional().nullable(),
    date_done: z.string().optional().nullable(),
    archived: z.boolean().optional(),
    creator: z
        .object({
            id: z.number(),
            username: z.string().optional().nullable(),
            email: z.string().optional().nullable(),
            color: z.string().optional().nullable(),
            profilePicture: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    assignees: z
        .array(
            z.object({
                id: z.number(),
                username: z.string().optional().nullable(),
                email: z.string().optional().nullable(),
                color: z.string().optional().nullable(),
                profilePicture: z.string().optional().nullable()
            })
        )
        .optional(),
    watchers: z
        .array(
            z.object({
                id: z.number(),
                username: z.string().optional().nullable(),
                email: z.string().optional().nullable(),
                color: z.string().optional().nullable(),
                profilePicture: z.string().optional().nullable()
            })
        )
        .optional(),
    tags: z.array(z.object({ name: z.string() })).optional(),
    parent: z.string().optional().nullable(),
    priority: z
        .object({
            priority: z.string(),
            color: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    due_date: z.string().optional().nullable(),
    start_date: z.string().optional().nullable(),
    time_estimate: z.union([z.string(), z.number()]).optional().nullable(),
    time_spent: z.union([z.string(), z.number()]).optional().nullable(),
    list: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional()
        .nullable(),
    folder: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional()
        .nullable(),
    space: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional()
        .nullable(),
    url: z.string().optional()
});

const ClickUpSpaceSchema = z.object({
    id: z.string(),
    name: z.string(),
    private: z.boolean().optional(),
    archived: z.boolean().optional(),
    statuses: z.array(z.unknown()).optional()
});

const ClickUpFolderSchema = z.object({
    id: z.string(),
    name: z.string(),
    orderindex: z.number().optional(),
    override_statuses: z.boolean().optional(),
    hidden: z.boolean().optional(),
    space: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional()
        .nullable(),
    archived: z.boolean().optional()
});

const ClickUpListSchema = z.object({
    id: z.string(),
    name: z.string(),
    orderindex: z.number().optional(),
    content: z.string().optional().nullable(),
    status: z
        .object({
            status: z.string(),
            color: z.string().optional(),
            type: z.string().optional(),
            orderindex: z.number().optional()
        })
        .optional()
        .nullable(),
    priority: z.unknown().optional().nullable(),
    assignee: z.unknown().optional().nullable(),
    task_count: z.number().optional().nullable(),
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
    space: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional()
        .nullable(),
    archived: z.boolean().optional(),
    deleted: z.boolean().optional(),
    created_by: z.unknown().optional().nullable()
});

// Normalized model schema
const TaskSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    status: z.string().optional(),
    orderindex: z.union([z.string(), z.number()]).optional(),
    date_created: z.string(),
    date_updated: z.string(),
    date_closed: z.string().optional(),
    date_done: z.string().optional(),
    archived: z.boolean().optional(),
    creator_id: z.number().optional(),
    creator_username: z.string().optional(),
    assignees: z
        .array(
            z.object({
                id: z.number(),
                username: z.string().optional(),
                email: z.string().optional()
            })
        )
        .optional(),
    tags: z.array(z.string()).optional(),
    parent_id: z.string().optional(),
    priority: z.string().optional(),
    due_date: z.string().optional(),
    start_date: z.string().optional(),
    time_estimate: z.union([z.string(), z.number()]).optional(),
    time_spent: z.union([z.string(), z.number()]).optional(),
    list_id: z.string().optional(),
    list_name: z.string().optional(),
    folder_id: z.string().optional(),
    folder_name: z.string().optional(),
    space_id: z.string().optional(),
    space_name: z.string().optional(),
    url: z.string().optional()
});

// Checkpoint schema for incremental sync
// ClickUp tasks API supports date_updated_gt (ms epoch) for incremental sync
// and page-based pagination. We store the max date_updated seen to use as the
// filter on subsequent runs.
const CheckpointSchema = z.object({
    updated_after: z.string()
});

const CHECKPOINT_OVERLAP_MS = 1;

// Type inference
type ClickUpList = z.infer<typeof ClickUpListSchema>;
type Task = z.infer<typeof TaskSchema>;

const sync = createSync({
    description: 'Sync tasks from ClickUp.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Task: TaskSchema
    },
    endpoints: [{ method: 'GET', path: '/syncs/tasks' }],

    exec: async (nango) => {
        // Get checkpoint for incremental sync
        const checkpoint = await nango.getCheckpoint();
        const checkpointMs = checkpoint?.updated_after ? parseCheckpointTimestamp(checkpoint.updated_after) : undefined;

        if (checkpoint?.updated_after && checkpointMs === undefined) {
            await nango.log('Ignoring invalid tasks checkpoint', {
                level: 'warn',
                checkpoint: checkpoint.updated_after
            });
        }

        // ClickUp uses a strict greater-than filter. Re-fetch a 1 ms overlap so
        // equal-timestamp updates are not skipped between runs.
        const updatedAfterMs = checkpointMs !== undefined ? String(Math.max(0, checkpointMs - CHECKPOINT_OVERLAP_MS)) : undefined;

        // Track the maximum date_updated seen across all tasks
        let maxDateUpdatedMs = 0;

        // Get metadata for team_id
        const metadata = await nango.getMetadata<{ team_id: string }>();
        const teamId = metadata?.team_id;

        if (!teamId) {
            throw new Error('team_id is required in metadata');
        }

        // Step 1: Get all spaces for the team
        const spacesResponse = await nango.get({
            // https://developer.clickup.com/reference/getspaces
            endpoint: `/api/v2/team/${encodeURIComponent(teamId)}/space`,
            retries: 3
        });

        const spacesData = z.object({ spaces: z.array(ClickUpSpaceSchema) }).safeParse(spacesResponse.data);

        if (!spacesData.success) {
            throw new Error(`Failed to parse spaces response: ${spacesData.error.message}`);
        }

        const spaces = spacesData.data.spaces;

        // Step 2 & 3: For each space, get folders and lists
        for (const space of spaces) {
            // Skip archived spaces
            if (space.archived) {
                continue;
            }

            // Get folderless lists in this space
            const folderlessListsResponse = await nango.get({
                // https://developer.clickup.com/reference/getfolderlesslists
                endpoint: `/api/v2/space/${encodeURIComponent(space.id)}/list`,
                retries: 3
            });

            const folderlessListsData = z.object({ lists: z.array(ClickUpListSchema) }).safeParse(folderlessListsResponse.data);

            if (!folderlessListsData.success) {
                throw new Error(`Failed to parse folderless lists response: ${folderlessListsData.error.message}`);
            }

            const folderlessLists = folderlessListsData.data.lists.filter((list) => !list.archived && !list.deleted);

            // Process folderless lists
            for (const list of folderlessLists) {
                await processList(nango, list, updatedAfterMs, (dateUpdatedMs) => {
                    if (dateUpdatedMs > maxDateUpdatedMs) {
                        maxDateUpdatedMs = dateUpdatedMs;
                    }
                });
            }

            // Get folders in this space
            const foldersResponse = await nango.get({
                // https://developer.clickup.com/reference/getfolders
                endpoint: `/api/v2/space/${encodeURIComponent(space.id)}/folder`,
                retries: 3
            });

            const foldersData = z.object({ folders: z.array(ClickUpFolderSchema) }).safeParse(foldersResponse.data);

            if (!foldersData.success) {
                throw new Error(`Failed to parse folders response: ${foldersData.error.message}`);
            }

            const folders = foldersData.data.folders.filter((folder) => !folder.archived && !folder.hidden);

            // For each folder, get its lists
            for (const folder of folders) {
                const folderListsResponse = await nango.get({
                    // https://developer.clickup.com/reference/getlists
                    endpoint: `/api/v2/folder/${encodeURIComponent(folder.id)}/list`,
                    retries: 3
                });

                const folderListsData = z.object({ lists: z.array(ClickUpListSchema) }).safeParse(folderListsResponse.data);

                if (!folderListsData.success) {
                    throw new Error(`Failed to parse folder lists response: ${folderListsData.error.message}`);
                }

                const folderLists = folderListsData.data.lists.filter((list) => !list.archived && !list.deleted);

                // Process each list in the folder
                for (const list of folderLists) {
                    await processList(nango, list, updatedAfterMs, (dateUpdatedMs) => {
                        if (dateUpdatedMs > maxDateUpdatedMs) {
                            maxDateUpdatedMs = dateUpdatedMs;
                        }
                    });
                }
            }
        }

        // Save checkpoint with the max date_updated seen
        if (maxDateUpdatedMs > 0) {
            await nango.saveCheckpoint({ updated_after: String(maxDateUpdatedMs) });
        }
    }
});

function parseCheckpointTimestamp(value: string): number | undefined {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
        return numericValue;
    }

    const parsedValue = Date.parse(value);
    if (Number.isFinite(parsedValue)) {
        return parsedValue;
    }

    return undefined;
}

/**
 * Process tasks from a single list with pagination
 * @allowTryCatch - not used; errors are thrown to fail the sync
 */
async function processList(
    nango: Parameters<(typeof sync)['exec']>[0],
    list: ClickUpList,
    updatedAfterMs: string | undefined,
    onTaskProcessed: (dateUpdatedMs: number) => void
): Promise<void> {
    // https://developer.clickup.com/reference/gettasks
    // Paginate tasks with page=0,1,2,... until last_page is true
    // Build base params
    const baseParams: Record<string, string | number | boolean> = {
        subtasks: 'true'
    };
    if (updatedAfterMs) {
        baseParams['date_updated_gt'] = updatedAfterMs;
    }

    // Track current page to detect last_page
    let currentPage = 0;
    let hasMorePages = true;

    while (hasMorePages) {
        // Update the page in params for this iteration
        const pageConfig: ProxyConfiguration = {
            // https://developer.clickup.com/reference/gettasks
            endpoint: `/api/v2/list/${encodeURIComponent(list.id)}/task`,
            params: {
                ...baseParams,
                page: currentPage
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 0,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'tasks'
            },
            retries: 3
        };

        // @allowTryCatch - pagination loop handles response parsing
        const response = await nango.get(pageConfig);

        // Parse and validate the response
        const tasksData = z
            .object({
                tasks: z.array(ClickUpTaskSchema),
                last_page: z.boolean().optional()
            })
            .safeParse(response.data);

        if (!tasksData.success) {
            throw new Error(`Failed to parse tasks response for list ${list.id}: ${tasksData.error.message}`);
        }

        const tasks = tasksData.data.tasks;
        const lastPage = tasksData.data.last_page ?? false;

        if (tasks.length === 0) {
            hasMorePages = false;
            break;
        }

        // Transform ClickUp tasks to normalized format
        const transformedTasks: Task[] = tasks.map((task) => {
            // Track the max date_updated
            const dateUpdatedMs = parseInt(task.date_updated, 10);
            onTaskProcessed(dateUpdatedMs);

            return {
                id: task.id,
                name: task.name,
                ...(task.description && { description: task.description }),
                ...(task.status && { status: task.status.status }),
                ...(task.orderindex !== undefined && { orderindex: task.orderindex }),
                date_created: task.date_created,
                date_updated: task.date_updated,
                ...(task.date_closed && { date_closed: task.date_closed }),
                ...(task.date_done && { date_done: task.date_done }),
                ...(task.archived !== undefined && { archived: task.archived }),
                ...(task.creator && {
                    creator_id: task.creator.id,
                    ...(task.creator.username && { creator_username: task.creator.username })
                }),
                ...(task.assignees &&
                    task.assignees.length > 0 && {
                        assignees: task.assignees.map((a) => ({
                            id: a.id,
                            ...(a.username && { username: a.username }),
                            ...(a.email && { email: a.email })
                        }))
                    }),
                ...(task.tags &&
                    task.tags.length > 0 && {
                        tags: task.tags.map((t) => t.name)
                    }),
                ...(task.parent && { parent_id: task.parent }),
                ...(task.priority && { priority: task.priority.priority }),
                ...(task.due_date && { due_date: task.due_date }),
                ...(task.start_date && { start_date: task.start_date }),
                ...(task.time_estimate !== undefined &&
                    task.time_estimate !== null && {
                        time_estimate: task.time_estimate
                    }),
                ...(task.time_spent !== undefined &&
                    task.time_spent !== null && {
                        time_spent: task.time_spent
                    }),
                ...(task.list && {
                    list_id: task.list.id,
                    list_name: task.list.name
                }),
                ...(task.folder && {
                    folder_id: task.folder.id,
                    folder_name: task.folder.name
                }),
                ...(task.space && {
                    space_id: task.space.id,
                    space_name: task.space.name
                }),
                url: task.url
            };
        });

        await nango.batchSave(transformedTasks, 'Task');

        if (lastPage) {
            hasMorePages = false;
        } else {
            currentPage += 1;
        }
    }
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
