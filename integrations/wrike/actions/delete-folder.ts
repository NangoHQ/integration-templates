import { z } from 'zod';
import { createAction } from 'nango';

const FolderProjectSchema = z
    .object({
        authorId: z.string().optional().describe('ID of the contact who created the project.'),
        ownerIds: z.array(z.string()).optional().describe('IDs of the project owners.'),
        customStatusId: z.string().optional().describe('ID of the custom status applied to the project.'),
        status: z.string().optional().describe('Project status, for example Green, Red, OnHold, Completed or Cancelled.'),
        createdDate: z.string().optional().describe('ISO 8601 timestamp when the project was created.'),
        startDate: z.string().optional().describe('Project start date in yyyy-MM-dd format.'),
        endDate: z.string().optional().describe('Project end date in yyyy-MM-dd format.'),
        completedDate: z.string().optional().describe('ISO 8601 timestamp when the project was completed.'),
        contractType: z.string().optional().describe('Billing contract type: Billable or NonBillable.')
    })
    .describe('Project-specific details present when the folder is a project.');

const OutputSchema = z
    .object({
        id: z.string().describe('Wrike folder ID.'),
        accountId: z.string().optional().describe('ID of the Wrike account that owns the folder.'),
        title: z.string().optional().describe('Folder title.'),
        description: z.string().optional().describe('Folder description.'),
        scope: z
            .string()
            .optional()
            .describe(
                'Folder tree scope after deletion. RbFolder or RbRoot indicates the folder now lives in the Recycle Bin; WsFolder or WsRoot indicates it is still active.'
            ),
        parentIds: z.array(z.string()).optional().describe('Parent folder IDs. After a successful delete this points at the account Recycle Bin folder.'),
        childIds: z.array(z.string()).optional().describe('IDs of the child folders contained in the folder.'),
        superParentIds: z.array(z.string()).optional().describe('Super parent folder IDs for selectively shared folders.'),
        sharedIds: z.array(z.string()).optional().describe('IDs of the contacts the folder is shared with.'),
        createdDate: z.string().optional().describe('ISO 8601 timestamp when the folder was created.'),
        updatedDate: z.string().optional().describe('ISO 8601 timestamp when the folder was last updated.'),
        hasAttachments: z.boolean().optional().describe('Whether the folder has attachments.'),
        permalink: z.string().optional().describe('Human-facing Wrike URL for the folder.'),
        workflowId: z.string().optional().describe('ID of the workflow applied to the folder.'),
        space: z.boolean().optional().describe('Whether the folder is a top-level space.'),
        project: FolderProjectSchema.optional().nullable().describe('Project details when the folder is a project, otherwise omitted.'),
        metadata: z.array(z.record(z.string(), z.unknown())).optional().describe('Custom metadata entries attached to the folder.'),
        customFields: z.array(z.record(z.string(), z.unknown())).optional().describe('Custom field values attached to the folder.')
    })
    .describe('The folder object as returned by Wrike after the delete request.');

const InputSchema = z
    .object({
        folderId: z.string().min(1).describe('ID of the folder to delete. Example: "MQAAAAEQ_HoD".')
    })
    .describe('Path parameters for deleting a Wrike folder.');

const DeleteFolderResponseSchema = z.object({
    data: z.array(OutputSchema)
});

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a provider folder (soft delete to the Recycle Bin) and cascades to every task inside it.
 * @pitfalls: Deleting a folder is a soft delete: it moves to the Recycle Bin and remains readable by ID, and every task inside it at delete time is moved there too even though only the folder is named; deleting an already-deleted folder fails.
 */
const action = createAction({
    description: 'Soft-delete a folder by moving it to the Recycle Bin.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const folderId = encodeURIComponent(input.folderId);

        // https://developers.wrike.com/api/v4/folders-projects/
        const response = await nango.delete({
            endpoint: `/folders/${folderId}`,
            // retries: 0 because DELETEs are not idempotent here - replaying one after a lost response returns a 400 for the already-trashed folder, which would mask an otherwise successful delete.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = DeleteFolderResponseSchema.parse(response.data);
        const folder = parsed.data[0];

        if (!folder) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `No folder data returned when deleting folder ${input.folderId}.`
            });
        }

        return folder;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
