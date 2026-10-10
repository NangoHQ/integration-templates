import { z } from 'zod';
import { createAction } from 'nango';

const ProjectUpdateSchema = z
    .object({
        startDate: z.string().nullable().optional().describe('New project start date in yyyy-MM-dd format. Pass null to clear the existing start date.'),
        endDate: z.string().nullable().optional().describe('New project end date in yyyy-MM-dd format. Pass null to clear the existing end date.'),
        customStatusId: z
            .string()
            .optional()
            .describe('Project custom status ID from the customStatuses of the account workflow (see list-workflows). Example: "IEAG5DAKJMHVMQVI".'),
        ownersAdd: z.array(z.string()).optional().describe('User IDs to add as project owners. Example: ["KUAZR5CO"]'),
        ownersRemove: z.array(z.string()).optional().describe('User IDs to remove from the project owners.')
    })
    .describe('Project-only fields to update. Supplying any of them to a plain folder converts that folder into a project.');

const InputSchema = z
    .object({
        folderId: z.string().describe('ID of the folder or project to update. Example: "MQAAAAEQ_HoD"'),
        title: z.string().optional().describe('New folder or project title. Omit to leave the current title unchanged.'),
        description: z.string().optional().describe('New folder or project description. Omit to leave the current description unchanged.'),
        project: ProjectUpdateSchema.optional()
    })
    .describe('Fields to change on a Wrike folder or project. Only the provided fields are updated.');

const ProviderProjectSchema = z.object({
    authorId: z.string().optional(),
    ownerIds: z.array(z.string()).optional(),
    customStatusId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    createdDate: z.string().optional()
});

const ProviderFolderSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    scope: z.string().optional(),
    parentIds: z.array(z.string()).optional(),
    childIds: z.array(z.string()).optional(),
    permalink: z.string().optional(),
    project: ProviderProjectSchema.optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderFolderSchema)
});

const ProjectSchema = z.object({
    authorId: z.string().optional().describe('ID of the user who created the project.'),
    ownerIds: z.array(z.string()).optional().describe('IDs of the users who own the project.'),
    customStatusId: z.string().optional().describe('ID of the project custom status.'),
    startDate: z.string().optional().describe('Project start date in yyyy-MM-dd format.'),
    endDate: z.string().optional().describe('Project end date in yyyy-MM-dd format.'),
    createdDate: z.string().optional().describe('Project creation timestamp in ISO 8601 format.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the updated folder or project.'),
        title: z.string().optional().describe('Current folder or project title.'),
        description: z.string().optional().describe('Current folder or project description.'),
        scope: z.string().optional().describe('Folder scope, e.g. "WsFolder" for an active folder or "RbFolder" for one in the Recycle Bin.'),
        parentIds: z.array(z.string()).optional().describe('IDs of the parent folders.'),
        childIds: z.array(z.string()).optional().describe('IDs of the child folders.'),
        permalink: z.string().optional().describe('Human-readable permalink URL for the folder or project.'),
        project: ProjectSchema.optional().describe('Project details, present only when the folder is a project.')
    })
    .describe('The folder or project as it exists after the update.');

/**
 * @tags: [write]
 * @tagReason: Updates (mutates) an existing Wrike folder or project; it does not read, delete, or revoke anything.
 * @pitfalls: An empty-string title or description is ignored and leaves the existing value unchanged; passing any project field to a plain folder converts that folder into a project.
 */
const action = createAction({
    description: 'Update a folder or project (title, description, dates, custom status, owners). Partial merge: only the provided fields change.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};

        if (input.title !== undefined) {
            params['title'] = input.title;
        }

        if (input.description !== undefined) {
            params['description'] = input.description;
        }

        if (input.project !== undefined) {
            const project: Record<string, unknown> = {};

            if (input.project.startDate !== undefined) {
                project['startDate'] = input.project.startDate;
            }
            if (input.project.endDate !== undefined) {
                project['endDate'] = input.project.endDate;
            }
            if (input.project.customStatusId !== undefined) {
                project['customStatusId'] = input.project.customStatusId;
            }
            if (input.project.ownersAdd !== undefined) {
                project['ownersAdd'] = input.project.ownersAdd;
            }
            if (input.project.ownersRemove !== undefined) {
                project['ownersRemove'] = input.project.ownersRemove;
            }

            if (Object.keys(project).length > 0) {
                params['project'] = JSON.stringify(project);
            }
        }

        const response = await nango.put({
            // https://developers.wrike.com/reference/putfolderssingle
            endpoint: `/folders/${encodeURIComponent(input.folderId)}`,
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const folder = parsed.data[0];

        if (!folder) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Wrike did not return the updated folder.',
                folderId: input.folderId
            });
        }

        return {
            id: folder.id,
            ...(folder.title !== undefined && { title: folder.title }),
            ...(folder.description !== undefined && { description: folder.description }),
            ...(folder.scope !== undefined && { scope: folder.scope }),
            ...(folder.parentIds !== undefined && { parentIds: folder.parentIds }),
            ...(folder.childIds !== undefined && { childIds: folder.childIds }),
            ...(folder.permalink !== undefined && { permalink: folder.permalink }),
            ...(folder.project !== undefined && {
                project: {
                    ...(folder.project.authorId !== undefined && { authorId: folder.project.authorId }),
                    ...(folder.project.ownerIds !== undefined && { ownerIds: folder.project.ownerIds }),
                    ...(folder.project.customStatusId !== undefined && { customStatusId: folder.project.customStatusId }),
                    ...(folder.project.startDate !== undefined && { startDate: folder.project.startDate }),
                    ...(folder.project.endDate !== undefined && { endDate: folder.project.endDate }),
                    ...(folder.project.createdDate !== undefined && { createdDate: folder.project.createdDate })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
