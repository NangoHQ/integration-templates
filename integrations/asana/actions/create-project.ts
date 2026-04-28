import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the project. Example: "Q1 Marketing Plan"'),
    workspace_gid: z.string().describe('The workspace or organization GID to create the project in. Example: "1202775892569436"'),
    team_gid: z
        .string()
        .optional()
        .describe('The team GID to share the project with. Required if the workspace is an organization. Example: "1214299875377454"'),
    privacy_setting: z.enum(['private', 'public_to_workspace']).optional().describe('The privacy setting of the project. Example: "public_to_workspace"'),
    notes: z.string().optional().describe('Free-form textual information associated with the project (description).'),
    color: z.string().optional().describe('Color of the project. Example: "dark-blue"'),
    due_date: z.string().optional().describe('The date at which the project is due. Format: YYYY-MM-DD.'),
    start_on: z.string().optional().describe('The day on which the project starts. Format: YYYY-MM-DD.'),
    default_view: z.enum(['list', 'board', 'timeline', 'calendar']).optional().describe('The default view of the project. Example: "list"'),
    owner: z.string().optional().describe('The user GID of the project owner. Example: "12345"')
});

const WorkspaceCompactSchema = z.object({
    gid: z.string(),
    name: z.string().optional(),
    resource_type: z.string().optional()
});

const TeamCompactSchema = z.object({
    gid: z.string(),
    name: z.string().optional(),
    resource_type: z.string().optional()
});

const OwnerCompactSchema = z.object({
    gid: z.string(),
    name: z.string().optional(),
    resource_type: z.string().optional()
});

const ProviderProjectSchema = z.object({
    gid: z.string(),
    name: z.string(),
    workspace: WorkspaceCompactSchema.optional(),
    team: TeamCompactSchema.optional(),
    privacy_setting: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    start_on: z.string().nullable().optional(),
    default_view: z.string().nullable().optional(),
    owner: OwnerCompactSchema.nullable().optional()
});

const OutputSchema = z.object({
    gid: z.string(),
    name: z.string(),
    workspace: z
        .object({
            gid: z.string(),
            name: z.string().optional()
        })
        .optional(),
    team: z
        .object({
            gid: z.string(),
            name: z.string().optional()
        })
        .optional(),
    privacy_setting: z.string().optional(),
    notes: z.string().optional(),
    color: z.string().optional(),
    due_date: z.string().optional(),
    start_on: z.string().optional(),
    default_view: z.string().optional(),
    owner: z.string().optional()
});

const action = createAction({
    description: 'Create a project in a workspace or team.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-project',
        group: 'Projects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const bodyData: Record<string, unknown> = {
            name: input.name,
            workspace: input.workspace_gid
        };

        if (input.team_gid !== undefined) {
            bodyData['team'] = input.team_gid;
        }

        if (input.privacy_setting !== undefined) {
            bodyData['privacy_setting'] = input.privacy_setting;
        }

        if (input.notes !== undefined) {
            bodyData['notes'] = input.notes;
        }

        if (input.color !== undefined) {
            bodyData['color'] = input.color;
        }

        if (input.due_date !== undefined) {
            bodyData['due_date'] = input.due_date;
        }

        if (input.start_on !== undefined) {
            bodyData['start_on'] = input.start_on;
        }

        if (input.default_view !== undefined) {
            bodyData['default_view'] = input.default_view;
        }

        if (input.owner !== undefined) {
            bodyData['owner'] = input.owner;
        }

        const config: ProxyConfiguration = {
            // https://developers.asana.com/reference/createproject
            endpoint: '/api/1.0/projects',
            data: { data: bodyData },
            retries: 1
        };

        const response = await nango.post(config);

        if (!response.data || typeof response.data !== 'object' || !('data' in response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response structure from Asana API.'
            });
        }

        const project = ProviderProjectSchema.parse(response.data.data);

        return {
            gid: project.gid,
            name: project.name,
            ...(project.workspace !== undefined && {
                workspace: {
                    gid: project.workspace.gid,
                    ...(project.workspace.name !== undefined && { name: project.workspace.name })
                }
            }),
            ...(project.team !== undefined && {
                team: {
                    gid: project.team.gid,
                    ...(project.team.name !== undefined && { name: project.team.name })
                }
            }),
            ...(project.privacy_setting != null && { privacy_setting: project.privacy_setting }),
            ...(project.notes != null && { notes: project.notes }),
            ...(project.color != null && { color: project.color }),
            ...(project.due_date != null && { due_date: project.due_date }),
            ...(project.start_on != null && { start_on: project.start_on }),
            ...(project.default_view != null && { default_view: project.default_view }),
            ...(project.owner != null && { owner: project.owner.gid })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
