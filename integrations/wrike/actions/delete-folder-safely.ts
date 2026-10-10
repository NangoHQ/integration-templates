import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        folderId: z.string().describe('ID of the Wrike folder or project to delete. Example: "MQAAAAEQ_HoI"'),
        confirm: z
            .boolean()
            .optional()
            .describe(
                'Set to true to delete the folder even when it still contains tasks (those tasks are cascaded to the Recycle Bin). Defaults to false when omitted.'
            )
    })
    .describe('Input for safely deleting a Wrike folder or project, optionally confirming the cascade of its tasks.');

const ProviderTaskSchema = z.object({
    id: z.string()
});

const ProviderFolderSchema = z.object({
    id: z.string(),
    scope: z.string().nullable().optional()
});

const FolderResponseSchema = z.object({
    data: z.array(ProviderFolderSchema)
});

const OutputSchema = z
    .object({
        deleted: z.boolean().describe('Whether the folder was deleted (moved to the Recycle Bin).'),
        blockedBy: z
            .enum(['has_tasks'])
            .optional()
            .describe('Reason deletion was blocked. Present with value "has_tasks" when the folder still contains tasks and confirm was not true.'),
        taskCount: z.number().optional().describe('Number of tasks found inside the folder before deletion was attempted.'),
        taskIds: z.array(z.string()).optional().describe('IDs of the tasks found inside the folder when deletion was blocked.'),
        cascadeDeletedTaskCount: z
            .number()
            .optional()
            .describe('Number of tasks moved to the Recycle Bin by the folder deletion cascade. Present when deleted is true.')
    })
    .describe('Result of the safe folder deletion attempt.');

/**
 * @tags: [read, write, destructive]
 * @tagReason: Reads the folder's tasks and re-reads the folder to verify deletion, then deletes the folder (a provider mutation that cascades tasks to the Recycle Bin).
 * @pitfalls: Folder deletion is a soft delete that moves the folder and every task inside it to the Recycle Bin (still readable by ID, with no permanent-purge option in this API), and with the default confirm=false a folder containing tasks is not deleted and returns blockedBy="has_tasks".
 */
const action = createAction({
    description: 'Safely delete a folder, blocking the cascading delete of its tasks unless explicitly confirmed.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const folderId = input.folderId;
        const taskIds: string[] = [];

        for await (const page of nango.paginate<unknown>({
            // https://developers.wrike.com/reference/getfolderssingletasks
            endpoint: `/folders/${encodeURIComponent(folderId)}/tasks`,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'nextPageToken',
                cursor_path_in_response: 'nextPageToken',
                response_path: 'data',
                limit_name_in_request: 'pageSize',
                limit: 1000
            },
            retries: 3
        })) {
            for (const item of page) {
                const task = ProviderTaskSchema.parse(item);
                taskIds.push(task.id);
            }
        }

        const taskCount = taskIds.length;

        if (taskCount > 0 && input.confirm !== true) {
            return {
                deleted: false,
                blockedBy: 'has_tasks',
                taskCount,
                taskIds
            };
        }

        await nango.delete({
            // https://developers.wrike.com/reference/deletefolder
            endpoint: `/folders/${encodeURIComponent(folderId)}`,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0 // Non-idempotent: a retry after a lost response re-deletes an already-trashed folder and gets 400.
        });

        const verification = await nango.get({
            // https://developers.wrike.com/reference/findfolder
            endpoint: `/folders/${encodeURIComponent(folderId)}`,
            retries: 3
        });

        const parsed = FolderResponseSchema.parse(verification.data);
        const deletedFolder = parsed.data[0];

        if (!deletedFolder || deletedFolder.scope !== 'RbFolder') {
            throw new nango.ActionError({
                type: 'delete_not_confirmed',
                message: `Folder was not confirmed as deleted (scope: ${deletedFolder?.scope ?? 'unknown'}).`,
                folderId
            });
        }

        return {
            deleted: true,
            cascadeDeletedTaskCount: taskCount
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
