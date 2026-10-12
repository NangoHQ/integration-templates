import { z } from 'zod';
import { createAction } from 'nango';

const ProviderProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().nullable().optional(),
    closed: z.boolean().optional(),
    groupId: z.string().nullable().optional(),
    viewMode: z.string().optional(),
    permission: z.string().optional(),
    kind: z.string().optional()
});

const InputSchema = z
    .object({
        offset: z.number().int().nonnegative().optional().describe('Zero-based index of the first project to return. Defaults to 0 when omitted.'),
        limit: z.number().int().positive().optional().describe('Maximum number of projects to return. Defaults to 200 when omitted.')
    })
    .describe("Optional pagination controls for listing the user's projects (lists).");

const ProjectSchema = z.object({
    id: z.string().describe('Unique project (list) identifier.'),
    name: z.string().describe('Display name of the project.'),
    color: z.string().optional().describe('Hex color of the project, for example "#F18181".'),
    closed: z.boolean().optional().describe('Whether the project is archived/closed.'),
    groupId: z.string().optional().describe('Identifier of the project group this project belongs to, if any.'),
    viewMode: z.string().optional().describe('Default view mode of the project, for example "list", "kanban", or "timeline".'),
    permission: z.string().optional().describe('The current user\'s permission on the project, for example "write" or "read".'),
    kind: z.string().optional().describe('Project kind, for example "TASK" or "NOTE".')
});

const OutputSchema = z
    .object({
        projects: z.array(ProjectSchema).describe('The projects (lists) returned for this page.'),
        next_offset: z
            .number()
            .int()
            .optional()
            .describe('Offset to pass as offset on the next call when another page may exist; omitted once the last page is returned.')
    })
    .describe("A page of the user's projects (lists) plus the offset for the next page when one exists.");

/**
 * @tags: [read]
 * @tagReason: Reads the user's projects (lists) from the provider without modifying any provider state.
 * @pitfalls: Only the first 200 projects are returned by default, so accounts with more projects are silently truncated unless a larger limit is requested and the remaining pages are fetched via offset.
 */
const action = createAction({
    description: "List all of the user's projects (lists).",
    version: '1.0.0',
    scopes: ['tasks:read'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.ticktick.com/docs/openapi.md (Project > Get User Project)
        const response = await nango.get({
            endpoint: '/open/v1/project',
            params: {
                ...(input.offset !== undefined && { offset: input.offset }),
                ...(input.limit !== undefined && { limit: input.limit })
            },
            retries: 3
        });

        const projects = z.array(ProviderProjectSchema).parse(response.data);
        const effectiveLimit = input.limit ?? 200;
        const offset = input.offset ?? 0;

        return {
            projects: projects.map((project) => ({
                id: project.id,
                name: project.name,
                ...(project.color != null && { color: project.color }),
                ...(project.closed !== undefined && { closed: project.closed }),
                ...(project.groupId != null && { groupId: project.groupId }),
                ...(project.viewMode !== undefined && { viewMode: project.viewMode }),
                ...(project.permission !== undefined && { permission: project.permission }),
                ...(project.kind !== undefined && { kind: project.kind })
            })),
            ...(projects.length === effectiveLimit && { next_offset: offset + projects.length })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
