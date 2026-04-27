import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_gid: z.string().min(1).describe('Globally unique identifier for the project. Example: "120987654321"'),
    name: z.string().optional().describe('Name of the project.'),
    notes: z.string().nullable().optional().describe('Free-form text notes for the project.'),
    html_notes: z.string().nullable().optional().describe('HTML-formatted notes for the project.'),
    due_on: z.string().nullable().optional().describe('Date (ISO 8601) on which the project is due. Example: "2026-12-31".'),
    start_on: z.string().nullable().optional().describe('Date (ISO 8601) on which the project starts. Example: "2026-01-01".'),
    color: z.string().nullable().optional().describe('Color of the project. Example: "light-red".'),
    archived: z.boolean().optional().describe('Whether the project is archived.'),
    public: z.boolean().optional().describe('Whether the project is public to its workspace members.'),
    is_template: z.boolean().optional().describe('Whether the project is a template.'),
    default_view: z.string().nullable().optional().describe('Default view for the project. Example: "list" or "board".')
});

const AsanaProjectSchema = z.object({
    gid: z.string(),
    resource_type: z.string().optional(),
    name: z.string(),
    notes: z.string().nullable().optional(),
    html_notes: z.string().nullable().optional(),
    archived: z.boolean().optional(),
    color: z.string().nullable().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    due_on: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    start_on: z.string().nullable().optional(),
    public: z.boolean().optional(),
    is_template: z.boolean().optional(),
    default_view: z.string().nullable().optional(),
    workspace: z
        .object({
            gid: z.string(),
            name: z.string().optional()
        })
        .optional(),
    owner: z
        .object({
            gid: z.string(),
            name: z.string().optional()
        })
        .nullable()
        .optional(),
    team: z
        .object({
            gid: z.string(),
            name: z.string().optional()
        })
        .nullable()
        .optional()
});

const OutputSchema = z.object({
    gid: z.string(),
    name: z.string(),
    notes: z.string().nullable().optional(),
    html_notes: z.string().nullable().optional(),
    archived: z.boolean().optional(),
    color: z.string().nullable().optional(),
    due_on: z.string().nullable().optional(),
    start_on: z.string().nullable().optional(),
    public: z.boolean().optional(),
    is_template: z.boolean().optional(),
    default_view: z.string().nullable().optional(),
    workspace_gid: z.string().optional(),
    owner_gid: z.string().nullable().optional()
});

const action = createAction({
    description: 'Update mutable fields on a project.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-project',
        group: 'Projects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {};

        if (input.name !== undefined) {
            payload['name'] = input.name;
        }
        if (input.notes !== undefined) {
            payload['notes'] = input.notes;
        }
        if (input.html_notes !== undefined) {
            payload['html_notes'] = input.html_notes;
        }
        if (input.due_on !== undefined) {
            payload['due_on'] = input.due_on;
        }
        if (input.start_on !== undefined) {
            payload['start_on'] = input.start_on;
        }
        if (input.color !== undefined) {
            payload['color'] = input.color;
        }
        if (input.archived !== undefined) {
            payload['archived'] = input.archived;
        }
        if (input.public !== undefined) {
            payload['public'] = input.public;
        }
        if (input.is_template !== undefined) {
            payload['is_template'] = input.is_template;
        }
        if (input.default_view !== undefined) {
            payload['default_view'] = input.default_view;
        }

        // https://developers.asana.com/reference/updateproject
        const response = await nango.put({
            endpoint: `/api/1.0/projects/${encodeURIComponent(input.project_gid)}`,
            data: {
                data: payload
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Received an unexpected response from the Asana API.'
            });
        }

        const responseObj = z.object({ data: z.unknown() }).parse(response.data);
        const providerProject = AsanaProjectSchema.parse(responseObj.data);

        return {
            gid: providerProject.gid,
            name: providerProject.name,
            ...(providerProject.notes !== undefined && { notes: providerProject.notes }),
            ...(providerProject.html_notes !== undefined && { html_notes: providerProject.html_notes }),
            ...(providerProject.archived !== undefined && { archived: providerProject.archived }),
            ...(providerProject.color !== undefined && { color: providerProject.color }),
            ...(providerProject.due_on !== undefined && { due_on: providerProject.due_on }),
            ...(providerProject.start_on !== undefined && { start_on: providerProject.start_on }),
            ...(providerProject.public !== undefined && { public: providerProject.public }),
            ...(providerProject.is_template !== undefined && { is_template: providerProject.is_template }),
            ...(providerProject.default_view !== undefined && { default_view: providerProject.default_view }),
            ...(providerProject.workspace !== undefined && { workspace_gid: providerProject.workspace.gid }),
            ...(providerProject.owner !== undefined && { owner_gid: providerProject.owner?.gid ?? null })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
