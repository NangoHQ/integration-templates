import { z } from 'zod';
import { createAction } from 'nango';

const DockItemSchema = z.object({
    id: z.number().describe('The unique identifier for the dock tool.'),
    title: z.string().describe('The display title of the dock tool.'),
    name: z.string().describe('The internal name of the dock tool, e.g., "todoset" or "message_board".'),
    enabled: z.boolean().describe('Whether the tool is enabled for the project.'),
    position: z.number().nullable().describe('The position of the tool in the dock.'),
    url: z.string().describe('The API URL for the dock tool.'),
    app_url: z.string().describe('The Basecamp app URL for the dock tool.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier for the created project.'),
        status: z.string().describe('The status of the project, e.g., "active".'),
        created_at: z.string().describe('The ISO 8601 timestamp when the project was created.'),
        updated_at: z.string().describe('The ISO 8601 timestamp when the project was last updated.'),
        name: z.string().describe('The name of the project.'),
        description: z.string().nullable().describe('The description of the project.'),
        purpose: z.string().describe('The purpose of the project, e.g., "topic".'),
        clients_enabled: z.boolean().describe('Whether client access is enabled for the project.'),
        timesheet_enabled: z.boolean().describe('Whether timesheets are enabled for the project.'),
        color: z.string().nullable().describe('The project color, if set.'),
        bookmark_url: z.string().describe('The API URL to bookmark the project.'),
        star_url: z.string().describe('The API URL to star the project.'),
        url: z.string().describe('The API URL for the project.'),
        app_url: z.string().describe('The Basecamp app URL for the project.'),
        dock: z.array(DockItemSchema).describe('The array of tools available in the project dock.'),
        all_access: z.boolean().describe('Whether the project is visible to all account members.'),
        bookmarked: z.boolean().optional().describe('Whether the project is bookmarked by the current user.')
    })
    .describe('The newly created Basecamp project.');

const InputSchema = z
    .object({
        name: z.string().describe('The name of the new project.'),
        description: z.string().optional().describe('An optional description for the project.')
    })
    .describe('Input for creating a new Basecamp project.');

/**
 * @tags: [write]
 * @tagReason: Creates a new project on the provider.
 * @pitfalls: Free or limited plans may return 507 Insufficient Storage when the account has reached its project limit.
 */
const action = createAction({
    description: 'Create a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/projects.md
            endpoint: '/projects.json',
            data: {
                name: input.name,
                ...(input.description !== undefined && { description: input.description })
            },
            retries: 3
        });

        if (response.status === 507) {
            const errorBody = z.object({ error: z.string() }).safeParse(response.data);
            throw new nango.ActionError({
                type: 'insufficient_storage',
                message: errorBody.success ? errorBody.data.error : 'The project limit for this account has been reached.'
            });
        }

        const providerProject = OutputSchema.parse(response.data);

        return providerProject;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
