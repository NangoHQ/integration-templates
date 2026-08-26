import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        status: z.enum(['active', 'archived', 'trashed']).optional().describe('Filter by project status. Omit to return active projects only.'),
        cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
    })
    .describe('Input for the list-projects action.');

const DockItemSchema = z.object({
    id: z.number().describe('Tool recording ID.'),
    title: z.string().describe('Display title of the tool.'),
    name: z.string().describe('Tool type identifier, e.g. "todoset", "message_board", "vault", "schedule", "chat", "kanban_board".'),
    url: z.string().describe('API URL for this tool.'),
    app_url: z.string().describe('App URL for this tool.'),
    enabled: z.boolean().describe('Whether the tool is enabled in the project dock.')
});

const CompanySchema = z.object({
    id: z.number().describe('Company ID.'),
    name: z.string().describe('Company name.')
});

const CreatorSchema = z.object({
    id: z.number().describe('Creator person ID.'),
    name: z.string().describe('Creator display name.')
});

const ProjectSchema = z.object({
    id: z.number().describe('Project ID.'),
    status: z.string().describe('Project status, e.g. "active".'),
    created_at: z.string().describe('ISO 8601 creation timestamp.'),
    updated_at: z.string().describe('ISO 8601 last-update timestamp.'),
    name: z.string().describe('Project name.'),
    description: z.string().nullable().optional().describe('Project description.'),
    purpose: z.string().optional().describe('Project purpose/category.'),
    url: z.string().describe('API URL for this project.'),
    app_url: z.string().describe('App URL for this project.'),
    bookmark_url: z.string().optional().describe('Bookmark URL for this project.'),
    clients_enabled: z.boolean().describe('Whether client access is enabled.'),
    bookmark_name: z.string().optional().describe('Bookmark name.'),
    template: z.boolean().optional().describe('Whether this is a template project.'),
    trashed: z.boolean().optional().describe('Whether the project is trashed.'),
    archived: z.boolean().optional().describe('Whether the project is archived.'),
    starred: z.boolean().optional().describe('Whether the project is starred by the current user.'),
    dock: z.array(DockItemSchema).describe('Enabled and disabled tools in the project dock, including their recording IDs for nested actions.'),
    company: CompanySchema.optional().describe('Associated company, if any.'),
    creator: CreatorSchema.optional().describe('Project creator.')
});

const OutputSchema = z
    .object({
        items: z.array(ProjectSchema).describe('Projects matching the requested status.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page, if more results exist.')
    })
    .describe('Output of the list-projects action.');

/**
 * @tags: [read]
 * @tagReason: Reads the list of projects visible to the current user.
 * @pitfalls: The dock array may be empty or include disabled tools; callers must verify a tool is present and enabled before using its id for nested actions.
 */
const action = createAction({
    description: 'List active projects visible to the current user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://github.com/basecamp/bc3-api/blob/master/sections/projects.md
            endpoint: '/projects.json',
            params: {
                ...(input.status !== undefined && { status: input.status }),
                ...(input.cursor !== undefined && { page: input.cursor })
            },
            retries: 3
        });

        const items = z.array(ProjectSchema).parse(response.data);

        let next_cursor: string | undefined;
        const linkHeader = response.headers?.['link'];
        if (typeof linkHeader === 'string') {
            const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
            if (nextMatch && nextMatch[1]) {
                const pageMatch = nextMatch[1].match(/[?&]page=([^&]+)/);
                if (pageMatch && pageMatch[1]) {
                    next_cursor = pageMatch[1];
                }
            }
        }

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
