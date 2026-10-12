import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('Identifier of the project to update. Example: "6226ff9877acee87727f6bca".'),
        name: z
            .string()
            .min(1)
            .max(64)
            .optional()
            .describe('New project name, up to 64 characters (TickTick silently truncates longer names). Omit to leave the current name unchanged.'),
        color: z.string().optional().describe('New project color as a hex code. Example: "#F18181". Omit to leave unchanged.'),
        sortOrder: z.number().int().optional().describe('New sort order value for the project. Omit to leave unchanged.'),
        viewMode: z.enum(['list', 'kanban', 'timeline']).optional().describe('New view mode: "list", "kanban" or "timeline". Omit to leave unchanged.'),
        kind: z.enum(['TASK', 'NOTE']).optional().describe('New project kind: "TASK" or "NOTE". Omit to leave unchanged.')
    })
    .describe('Fields to change on an existing project; omitted fields are left unchanged.');

const ProviderProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    sortOrder: z.number().optional(),
    closed: z.boolean().optional(),
    groupId: z.string().optional(),
    viewMode: z.string().optional(),
    permission: z.string().optional(),
    kind: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Identifier of the updated project.'),
        name: z.string().describe('Name of the project after the update.'),
        color: z.string().optional().describe('Project color hex code, present when set.'),
        sortOrder: z.number().optional().describe('Sort order value of the project, present when set.'),
        closed: z.boolean().optional().describe('Whether the project is closed, present when set.'),
        groupId: z.string().optional().describe('Identifier of the project group the project belongs to, present when set.'),
        viewMode: z.string().optional().describe('View mode of the project, present when set.'),
        permission: z.string().optional().describe('Caller permission on the project: "read", "write" or "comment", present when set.'),
        kind: z.string().optional().describe('Kind of the project: "TASK" or "NOTE", present when set.')
    })
    .describe('The project as returned after the update; fields not set on the project are omitted.');

/**
 * @tags: [write]
 * @tagReason: Updates a project's fields on the provider; it mutates the project but does not delete or clear anything.
 * @pitfalls: Omitted fields are left unchanged (a true partial merge), so a field cannot be cleared by omission, and the response omits unset fields such as color rather than returning them as null.
 */
const action = createAction({
    description: "Update a project's fields. Only send the fields you want to change.",
    version: '1.0.0',
    scopes: ['tasks:write'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.ticktick.com/docs/openapi.md
            endpoint: `/open/v1/project/${encodeURIComponent(input.projectId)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.color !== undefined && { color: input.color }),
                ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
                ...(input.viewMode !== undefined && { viewMode: input.viewMode }),
                ...(input.kind !== undefined && { kind: input.kind })
            },
            retries: 3
        });

        const project = ProviderProjectSchema.parse(response.data);

        return {
            id: project.id,
            name: project.name,
            ...(project.color !== undefined && { color: project.color }),
            ...(project.sortOrder !== undefined && { sortOrder: project.sortOrder }),
            ...(project.closed !== undefined && { closed: project.closed }),
            ...(project.groupId !== undefined && { groupId: project.groupId }),
            ...(project.viewMode !== undefined && { viewMode: project.viewMode }),
            ...(project.permission !== undefined && { permission: project.permission }),
            ...(project.kind !== undefined && { kind: project.kind })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
