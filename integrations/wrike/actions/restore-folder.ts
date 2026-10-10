import { z } from 'zod';
import { createAction } from 'nango';

const TreeScopeSchema = z.enum(['WsTask', 'RbRoot', 'RbFolder', 'WsFolder', 'WsRoot', 'RbTask']);

const ProviderProjectSchema = z.object({
    authorId: z.string().optional(),
    ownerIds: z.array(z.string()).optional(),
    status: z.string().optional(),
    customStatusId: z.string().optional(),
    createdDate: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional()
});

const ProviderFolderSchema = z.object({
    id: z.string(),
    title: z.string(),
    createdDate: z.string().optional(),
    updatedDate: z.string().optional(),
    description: z.string().optional(),
    parentIds: z.array(z.string()).optional(),
    childIds: z.array(z.string()).optional(),
    scope: TreeScopeSchema.optional(),
    hasAttachments: z.boolean().optional(),
    permalink: z.string().optional(),
    project: ProviderProjectSchema.optional()
});

const ProviderResponseSchema = z.object({
    kind: z.string(),
    data: z.array(ProviderFolderSchema)
});

const InputSchema = z
    .object({
        folderId: z.string().describe('Wrike API ID of the soft-deleted folder to restore from the Recycle Bin. Example: "MQAAAAERHC3x"')
    })
    .describe('Input for restoring a soft-deleted Wrike folder from the Recycle Bin.');

const OutputSchema = z
    .object({
        id: z.string().describe('Wrike API ID of the restored folder. Example: "MQAAAAERHC3x"'),
        title: z.string().describe('Title of the restored folder or project.'),
        scope: TreeScopeSchema.optional().describe('Folder tree scope after restore; "WsFolder" for an active folder and "WsRoot" for the account root.'),
        parentIds: z
            .array(z.string())
            .optional()
            .describe('IDs of the folders the restored folder now lives under; after restore this reverts to the original parent instead of the Recycle Bin.'),
        childIds: z.array(z.string()).optional().describe('IDs of the child folders contained in the restored folder.'),
        permalink: z.string().optional().describe('Human-facing Wrike URL for the restored folder. Example: "https://www.wrike.com/open.htm?id=4582026737"'),
        createdDate: z.string().optional().describe('Creation timestamp in Wrike format. Example: "2026-10-09T23:27:49Z"'),
        updatedDate: z.string().optional().describe('Last-modified timestamp in Wrike format. Example: "2026-10-09T23:28:25Z"'),
        description: z.string().optional().describe('Folder description text, an empty string when none is set.'),
        hasAttachments: z.boolean().optional().describe('Whether the restored folder has attachments.'),
        project: z
            .object({
                authorId: z.string().optional().describe('ID of the user who created the project.'),
                ownerIds: z.array(z.string()).optional().describe('IDs of the project owners.'),
                status: z.string().optional().describe('Project status, e.g. "Green", "Completed", or "Custom".'),
                customStatusId: z.string().optional().describe('ID of the custom status when the project uses a custom status.'),
                createdDate: z.string().optional().describe('Project creation timestamp in Wrike format.'),
                startDate: z.string().optional().describe('Project start date in yyyy-MM-dd format.'),
                endDate: z.string().optional().describe('Project end date in yyyy-MM-dd format.')
            })
            .optional()
            .describe('Present only when the restored folder is a project; absent for plain folders.')
    })
    .describe('The restored Wrike folder, including its scope and restored parent location.');

/**
 * @tags: [write]
 * @tagReason: Mutates provider state by moving a soft-deleted folder out of the Recycle Bin and back to its original location; it performs no separate provider read.
 * @pitfalls: Restoring a folder does not restore the sub-items (tasks/child folders) that were cascade-deleted with it, and task dependencies are not restored either. The call fails if the folder is not currently in the Recycle Bin, for example when it is already active.
 */
const action = createAction({
    description: 'Restore a previously soft-deleted folder (and implicitly whatever was cascade-deleted with it) back to its original location.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developers.wrike.com/reference/putfolderssingle
            endpoint: `/folders/${encodeURIComponent(input.folderId)}`,
            params: {
                restore: 'true'
            },
            // Restore is an idempotent PUT: repeated calls converge on the same active-folder state, so retries are safe.
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const folder = parsed.data[0];

        if (!folder) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Wrike did not return a folder when restoring it.',
                folderId: input.folderId
            });
        }

        return {
            id: folder.id,
            title: folder.title,
            ...(folder.scope != null && { scope: folder.scope }),
            ...(folder.parentIds != null && { parentIds: folder.parentIds }),
            ...(folder.childIds != null && { childIds: folder.childIds }),
            ...(folder.permalink != null && { permalink: folder.permalink }),
            ...(folder.createdDate != null && { createdDate: folder.createdDate }),
            ...(folder.updatedDate != null && { updatedDate: folder.updatedDate }),
            ...(folder.description != null && { description: folder.description }),
            ...(folder.hasAttachments != null && { hasAttachments: folder.hasAttachments }),
            ...(folder.project != null && { project: folder.project })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
