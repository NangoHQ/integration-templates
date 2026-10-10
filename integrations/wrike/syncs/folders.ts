import { createSync } from 'nango';
import { z } from 'zod';

const PAGE_SIZE = 1000;
const EPOCH = '1970-01-01T00:00:00Z';

const FolderProjectSchema = z
    .object({
        authorId: z.string().optional().describe('ID of the user who created the project.'),
        ownerIds: z.array(z.string()).optional().describe('IDs of the users and groups that own the project.'),
        customStatusId: z.string().optional().describe('ID of the custom status assigned to the project.'),
        createdDate: z.string().optional().describe('Project creation timestamp in ISO 8601 format.'),
        status: z.string().optional().describe('Project status, for example Green, Red, OnHold or Completed.'),
        startDate: z.string().optional().describe('Project start date in YYYY-MM-DD format.'),
        endDate: z.string().optional().describe('Project end date in YYYY-MM-DD format.'),
        completedDate: z.string().optional().describe('Project completion timestamp in ISO 8601 format.'),
        contractType: z.string().optional().describe('Project contract type: Billable or NonBillable.')
    })
    .describe('Project-specific metadata attached to a folder; present and non-null only when the folder is a project.');

const FolderSchema = z
    .object({
        id: z.string().describe('Unique Wrike folder/project ID (opaque string).'),
        accountId: z.string().optional().describe('ID of the Wrike account that owns the folder.'),
        title: z.string().describe('Folder or project title.'),
        createdDate: z.string().optional().describe('Folder creation timestamp in ISO 8601 format.'),
        updatedDate: z.string().optional().describe('Timestamp of the last modification to the folder, in ISO 8601 format.'),
        description: z.string().optional().describe('Folder or project description.'),
        sharedIds: z.array(z.string()).optional().describe('IDs of the users and groups the folder is shared with.'),
        parentIds: z.array(z.string()).optional().describe('IDs of the parent folders; top-level folders point at the account root.'),
        childIds: z.array(z.string()).optional().describe('IDs of the direct child folders.'),
        scope: z.string().optional().describe('Folder tree scope, for example WsFolder for active folders or RbFolder for Recycle Bin folders.'),
        permalink: z.string().optional().describe('Human-readable Wrike web URL for the folder.'),
        workflowId: z.string().optional().describe('ID of the workflow associated with the folder.'),
        isProject: z.boolean().describe('True when the folder is a project (it has a non-null project sub-object), false for a plain folder.'),
        project: FolderProjectSchema.nullable().optional().describe('Project metadata; non-null only when the folder is a project.')
    })
    .describe('An active Wrike folder or project.');

const ProviderFolderSchema = FolderSchema.omit({ isProject: true });

const FoldersResponseSchema = z.object({
    kind: z.string().optional(),
    nextPageToken: z.string().optional(),
    responseSize: z.number().optional(),
    data: z.array(ProviderFolderSchema)
});

const DeletedFolderSchema = z.object({
    id: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string().describe('Start of the next incremental updatedDate window; EPOCH on the initial full scan.'),
    window_started_at: z.string().describe('Timestamp when the current scan window began; becomes the next updated_after once the scan completes.'),
    next_page_token: z.string().describe('Wrike nextPageToken for resuming an in-progress scan; empty when the scan is complete.')
});

const sync = createSync({
    description:
        'Sync every active folder and project (a Project is a Folder with a project sub-object) in the Wrike account, and remove folders moved to the Recycle Bin.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Folder: FolderSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const now = new Date().toISOString();

        const savedPageToken = checkpoint?.next_page_token;
        let nextPageToken: string | undefined = savedPageToken !== undefined && savedPageToken !== '' ? savedPageToken : undefined;

        // Always filter by updatedDate so Wrike operates in "folders" mode (which supports
        // pageSize/nextPageToken); the first run uses EPOCH to fetch every folder.
        const filterStart = checkpoint?.updated_after !== undefined && checkpoint.updated_after !== '' ? checkpoint.updated_after : EPOCH;
        const windowStartedAt = nextPageToken !== undefined ? (checkpoint?.window_started_at ?? now) : now;

        let hasMorePages = true;
        while (hasMorePages) {
            const params: Record<string, string | number> = {
                // CRITICAL: without an explicit deleted=false, GET /folders mixes active and
                // Recycle Bin folders together. deleted=false returns only active folders.
                deleted: 'false',
                updatedDate: JSON.stringify({ start: filterStart })
            };

            if (nextPageToken !== undefined) {
                params['nextPageToken'] = nextPageToken;
            } else {
                params['pageSize'] = PAGE_SIZE;
            }

            // https://developers.wrike.com/reference/getfoldersempty
            const response = await nango.get<unknown>({
                endpoint: '/folders',
                params,
                retries: 3
            });

            const parsed = FoldersResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse Wrike folders response: ${parsed.error.message}`);
            }

            const folders = parsed.data.data.map((folder) => ({
                ...folder,
                isProject: folder.project != null
            }));

            if (folders.length === 0) {
                // Wrike returns a nextPageToken with an empty page (e.g. no changes since the last run) and rejects it if sent back.
                break;
            }

            await nango.batchSave(folders, 'Folder');

            const token = parsed.data.nextPageToken;
            if (token === undefined || token === '') {
                hasMorePages = false;
                break;
            }

            nextPageToken = token;
            await nango.saveCheckpoint({
                updated_after: filterStart,
                window_started_at: windowStartedAt,
                next_page_token: token
            });
        }

        // Trashing a folder (directly or by cascade) bumps its updatedDate and moves it out of the
        // deleted=false listing, so remove folders that entered the Recycle Bin during this window.
        // The initial scan has nothing saved yet to remove.
        if (filterStart !== EPOCH) {
            // https://developers.wrike.com/reference/getfoldersempty
            for await (const page of nango.paginate<unknown>({
                endpoint: '/folders',
                params: {
                    deleted: 'true',
                    updatedDate: JSON.stringify({ start: filterStart })
                },
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'nextPageToken',
                    cursor_path_in_response: 'nextPageToken',
                    response_path: 'data',
                    limit_name_in_request: 'pageSize',
                    limit: PAGE_SIZE
                },
                retries: 3
            })) {
                const deleted = page.map((record) => ({ id: DeletedFolderSchema.parse(record).id }));
                if (deleted.length > 0) {
                    await nango.batchDelete(deleted, 'Folder');
                }
            }
        }

        // The scan finished: advance the incremental filter to this run's window start and
        // drop the pagination token. Records changed during the scan are re-fetched next run.
        await nango.saveCheckpoint({
            updated_after: windowStartedAt,
            window_started_at: windowStartedAt,
            next_page_token: ''
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
