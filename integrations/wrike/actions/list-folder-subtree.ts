import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        folderId: z.string().describe('ID of the folder or project whose full descendant subtree should be listed. Example: "MQAAAAEQ_HoD"')
    })
    .describe('Identifies the Wrike folder or project whose subtree should be listed.');

const ProviderProjectSchema = z.object({
    authorId: z.string().optional(),
    ownerIds: z.array(z.string()).optional(),
    status: z.string().optional(),
    customStatusId: z.string().optional(),
    createdDate: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    completedDate: z.string().optional(),
    contractType: z.string().optional()
});

const ProviderFolderSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    childIds: z.array(z.string()).optional(),
    scope: z.string().optional(),
    space: z.boolean().optional(),
    project: ProviderProjectSchema.optional()
});

const ProviderFolderTreeSchema = z.object({
    kind: z.string(),
    data: z.array(ProviderFolderSchema)
});

const ProjectSchema = z.object({
    authorId: z.string().optional().describe('ID of the user who created the project.'),
    ownerIds: z.array(z.string()).optional().describe('IDs of the users who own the project.'),
    status: z.string().optional().describe('Project status, for example "Green", "Completed" or "Custom".'),
    customStatusId: z.string().optional().describe('ID of the custom status currently applied to the project.'),
    createdDate: z.string().optional().describe('Date the project was created.'),
    startDate: z.string().optional().describe('Project start date.'),
    endDate: z.string().optional().describe('Project end date.'),
    completedDate: z.string().optional().describe('Date the project was completed.'),
    contractType: z.string().optional().describe('Billing contract type, for example "Billable" or "NonBillable".')
});

const FolderSchema = z.object({
    id: z.string().describe('Folder or project ID. Example: "MQAAAAEQ_HoI"'),
    title: z.string().optional().describe('Title of the folder or project.'),
    depth: z.number().describe('0-based depth relative to the requested folder: the requested folder itself is 0, its direct children are 1, and so on.'),
    parentId: z.string().optional().describe('ID of the immediate parent folder within this subtree. Omitted for the requested folder itself.'),
    childIds: z.array(z.string()).describe('IDs of the direct child folders/projects contained in this folder.'),
    scope: z.string().optional().describe('Wrike tree scope, for example "WsFolder" for an active folder or "RbFolder" for a folder in the Recycle Bin.'),
    space: z.boolean().optional().describe('Whether this folder is a Space. Only present when Wrike includes it in the response.'),
    project: ProjectSchema.optional().describe('Project details when this folder is a Project. Omitted for plain folders.')
});

const OutputSchema = z
    .object({
        folders: z.array(FolderSchema).describe('Flat list containing the requested folder and every descendant folder/project at any depth.')
    })
    .describe('The requested folder and all of its descendant folders/projects.');

type Position = {
    depth: number;
    parentId: string | null;
};

function normalizeProject(project: z.infer<typeof ProviderProjectSchema>): z.infer<typeof ProjectSchema> {
    return {
        ...(project.authorId != null && { authorId: project.authorId }),
        ...(project.ownerIds != null && { ownerIds: project.ownerIds }),
        ...(project.status != null && { status: project.status }),
        ...(project.customStatusId != null && { customStatusId: project.customStatusId }),
        ...(project.createdDate != null && { createdDate: project.createdDate }),
        ...(project.startDate != null && { startDate: project.startDate }),
        ...(project.endDate != null && { endDate: project.endDate }),
        ...(project.completedDate != null && { completedDate: project.completedDate }),
        ...(project.contractType != null && { contractType: project.contractType })
    };
}

/**
 * @tags: [read]
 * @tagReason: Lists folders and projects from Wrike without modifying any provider data.
 * @pitfalls: The result includes the requested folder itself at depth 0, is a flat list in provider order whose order does not encode hierarchy, and omits parentId for the requested folder; depth and parentId are derived by the action (the provider returns no explicit depth), so reconstruct the tree from depth/parentId/childIds.
 */
const action = createAction({
    description: 'List a folder plus every folder/project nested beneath it.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.wrike.com/reference/getfolderssinglefolders
        const response = await nango.get({
            endpoint: `/folders/${encodeURIComponent(input.folderId)}/folders`,
            retries: 3
        });

        const tree = ProviderFolderTreeSchema.parse(response.data);

        const byId = new Map<string, z.infer<typeof ProviderFolderSchema>>();
        for (const folder of tree.data) {
            byId.set(folder.id, folder);
        }

        const root = byId.get(input.folderId);
        if (root === undefined) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'The requested folder was not present in its own subtree response.',
                folderId: input.folderId
            });
        }

        const positions = new Map<string, Position>();
        const queue: Array<{ id: string; depth: number; parentId: string | null }> = [{ id: root.id, depth: 0, parentId: null }];
        let cursor = 0;
        while (cursor < queue.length) {
            const current = queue[cursor];
            cursor += 1;
            if (current === undefined || positions.has(current.id)) {
                continue;
            }
            positions.set(current.id, { depth: current.depth, parentId: current.parentId });
            const folder = byId.get(current.id);
            if (folder === undefined) {
                continue;
            }
            for (const childId of folder.childIds ?? []) {
                if (!positions.has(childId)) {
                    queue.push({ id: childId, depth: current.depth + 1, parentId: current.id });
                }
            }
        }

        const folders = tree.data.map((folder) => {
            const position = positions.get(folder.id);
            const depth = position !== undefined ? position.depth : 0;
            const parentId = position !== undefined ? position.parentId : null;
            return {
                id: folder.id,
                ...(folder.title != null && { title: folder.title }),
                depth,
                ...(parentId !== null && { parentId }),
                childIds: folder.childIds ?? [],
                ...(folder.scope != null && { scope: folder.scope }),
                ...(folder.space != null && { space: folder.space }),
                ...(folder.project != null && { project: normalizeProject(folder.project) })
            };
        });

        return { folders };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
