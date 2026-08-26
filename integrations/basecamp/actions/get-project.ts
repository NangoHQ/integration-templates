import { z } from 'zod';
import { createAction } from 'nango';

const DockToolSchema = z.object({
    id: z.number().describe('The unique ID of the dock tool.'),
    title: z.string().describe('The human-readable title of the tool.'),
    name: z.string().describe('The machine name of the tool type (e.g. message_board, todoset, vault).'),
    enabled: z.boolean().describe('Whether the tool is currently enabled for the project.'),
    position: z.number().nullable().describe('The display position of the tool in the dock, or null if disabled.'),
    url: z.string().describe('The API URL for this tool.'),
    app_url: z.string().describe('The web app URL for this tool.')
});

const TeamPersonSchema = z.object({
    id: z.number().describe('The unique ID of the person.'),
    name: z.string().describe('The full name of the person.'),
    avatar_url: z.string().describe("The URL of the person's avatar image.")
});

const PeopleSchema = z.object({
    team: z
        .object({
            count: z.number().describe('The total number of people on the project team.'),
            sample: z.array(TeamPersonSchema).describe('A sample of up to 8 people on the project team.')
        })
        .describe('Project team membership information.')
});

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the Basecamp project to retrieve.')
    })
    .describe('Input for retrieving a single Basecamp project.');

const OutputSchema = z
    .object({
        id: z.number().describe('The unique ID of the project.'),
        status: z.string().describe('The project status (active, archived, or trashed).'),
        created_at: z.string().describe('The ISO 8601 timestamp when the project was created.'),
        updated_at: z.string().describe('The ISO 8601 timestamp when the project was last updated.'),
        name: z.string().describe('The name of the project.'),
        description: z.string().optional().describe('The description of the project.'),
        purpose: z.string().describe('The purpose of the project (e.g. topic).'),
        clients_enabled: z.boolean().describe('Whether client access is enabled for this project.'),
        timesheet_enabled: z.boolean().describe('Whether timesheets are enabled for this project.'),
        color: z.string().nullable().optional().describe('The project color, or null if not set.'),
        last_needle_color: z.string().optional().describe('The color of the last activity needle.'),
        last_needle_position: z.number().optional().describe('The position of the last activity needle.'),
        previous_needle_position: z.number().nullable().optional().describe('The previous needle position, or null.'),
        bookmark_url: z.string().optional().describe('The API URL to bookmark this project.'),
        star_url: z.string().optional().describe('The API URL to star this project.'),
        url: z.string().describe('The API URL for this project.'),
        app_url: z.string().describe('The web app URL for this project.'),
        all_access: z.boolean().describe('Whether the project is visible to all account members.'),
        bookmarked: z.boolean().optional().describe('Whether the current user has bookmarked this project.'),
        dock: z.array(DockToolSchema).describe('The array of tools (dock items) available in this project.'),
        people: PeopleSchema.describe('Project team membership information.'),
        client_company: z
            .object({
                id: z.number().describe('The unique ID of the client company.'),
                name: z.string().describe('The name of the client company.')
            })
            .optional()
            .describe('The client company associated with this project, if any.')
    })
    .describe('A single Basecamp project, including its dock tools and team sample.');

const ProviderProjectSchema = z
    .object({
        id: z.number(),
        status: z.string(),
        created_at: z.string(),
        updated_at: z.string(),
        name: z.string(),
        description: z.string().nullable().optional(),
        purpose: z.string(),
        clients_enabled: z.boolean(),
        timesheet_enabled: z.boolean(),
        color: z.string().nullable().optional(),
        last_needle_color: z.string().optional(),
        last_needle_position: z.number().optional(),
        previous_needle_position: z.number().nullable().optional(),
        bookmark_url: z.string().optional(),
        star_url: z.string().optional(),
        url: z.string(),
        app_url: z.string(),
        all_access: z.boolean(),
        bookmarked: z.boolean().optional(),
        dock: z.array(
            z.object({
                id: z.number(),
                title: z.string(),
                name: z.string(),
                enabled: z.boolean(),
                position: z.number().nullable(),
                url: z.string(),
                app_url: z.string()
            })
        ),
        people: z.object({
            team: z.object({
                count: z.number(),
                sample: z.array(
                    z.object({
                        id: z.number(),
                        name: z.string(),
                        avatar_url: z.string()
                    })
                )
            })
        }),
        client_company: z
            .object({
                id: z.number(),
                name: z.string()
            })
            .optional()
    })
    .passthrough();

/**
 * @tags: [read]
 * @tagReason: Performs a single GET request to retrieve a Basecamp project.
 * @pitfalls: Disabled tools remain in the dock array with `enabled: false` and `position: null`; filter by `enabled` to find active tools.
 */
const action = createAction({
    description: 'Retrieve a single project, including its dock (tool list) and team sample.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://github.com/basecamp/bc3-api/blob/master/sections/projects.md#get-a-project
            endpoint: `/projects/${encodeURIComponent(input.projectId)}.json`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Project ${input.projectId} not found or inaccessible.`
            });
        }

        const project = ProviderProjectSchema.parse(response.data);

        return {
            id: project.id,
            status: project.status,
            created_at: project.created_at,
            updated_at: project.updated_at,
            name: project.name,
            ...(project.description !== undefined && project.description !== null && { description: project.description }),
            purpose: project.purpose,
            clients_enabled: project.clients_enabled,
            timesheet_enabled: project.timesheet_enabled,
            ...(project.color !== undefined && project.color !== null && { color: project.color }),
            ...(project.last_needle_color !== undefined && { last_needle_color: project.last_needle_color }),
            ...(project.last_needle_position !== undefined && { last_needle_position: project.last_needle_position }),
            ...(project.previous_needle_position !== undefined &&
                project.previous_needle_position !== null && { previous_needle_position: project.previous_needle_position }),
            ...(project.bookmark_url !== undefined && { bookmark_url: project.bookmark_url }),
            ...(project.star_url !== undefined && { star_url: project.star_url }),
            url: project.url,
            app_url: project.app_url,
            all_access: project.all_access,
            ...(project.bookmarked !== undefined && { bookmarked: project.bookmarked }),
            dock: project.dock.map((tool) => ({
                id: tool.id,
                title: tool.title,
                name: tool.name,
                enabled: tool.enabled,
                position: tool.position,
                url: tool.url,
                app_url: tool.app_url
            })),
            people: {
                team: {
                    count: project.people.team.count,
                    sample: project.people.team.sample.map((person) => ({
                        id: person.id,
                        name: person.name,
                        avatar_url: person.avatar_url
                    }))
                }
            },
            ...(project.client_company !== undefined && { client_company: project.client_company })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
