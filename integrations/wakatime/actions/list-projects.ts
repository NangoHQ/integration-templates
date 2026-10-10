import { z } from 'zod';
import { createAction } from 'nango';

const ProjectSchema = z.object({
    id: z.string().describe('Unique identifier of the project. Example: "aad5abc8-4500-4904-9887-c695bde7894d"'),
    name: z.string().describe('Project name, derived from the `project` field of recorded heartbeats. Example: "nango-integrations"'),
    color: z.string().nullable().describe('Custom project color as a hex string, or null when the default color is used.'),
    repository: z.string().nullable().describe('Associated repository name when one is connected, otherwise null.'),
    badge: z.string().nullable().describe('Associated project badge when one is enabled, otherwise null.'),
    clients: z.array(z.unknown()).describe('Clients (editors/plugins) that have recorded activity for this project.'),
    has_public_url: z.boolean().describe('Whether this project has a shareable public url defined.'),
    url: z.string().describe('Path of this project relative to wakatime.com. Example: "/projects/nango-integrations"'),
    urlencoded_name: z.string().describe('URL-encoded project name. Example: "nango-integrations"'),
    first_heartbeat_at: z
        .string()
        .nullable()
        .optional()
        .describe('Time the project first received code stats in ISO 8601 format; only set for accounts created after 2024-02-05T00:00:00Z UTC.'),
    last_heartbeat_at: z.string().describe('Time the project last received code stats in ISO 8601 format. Example: "2026-10-10T00:24:55Z"'),
    human_readable_first_heartbeat_at: z
        .string()
        .nullable()
        .optional()
        .describe('Human-readable time the project first received code stats; only set for accounts created after 2024-02-05T00:00:00Z UTC.'),
    human_readable_last_heartbeat_at: z.string().describe('Human-readable time the project last received code stats. Example: "Oct 10, 2026, 3:24 AM EAT"'),
    created_at: z.string().describe('Time the project was created in ISO 8601 format. Example: "2026-10-10T00:25:54Z"')
});

const InputSchema = z
    .object({
        page: z.number().int().positive().optional().describe('Page number to fetch, starting at 1. Omit to fetch the first page.')
    })
    .describe("Input for listing the current user's WakaTime projects.");

const OutputSchema = z
    .object({
        data: z.array(ProjectSchema).describe('Projects recorded for the current user on the requested page.'),
        total: z.number().describe('Total number of projects across all pages.'),
        total_pages: z.number().describe('Total number of pages available.'),
        page: z.number().describe('Page number of this response.'),
        prev_page: z.number().nullable().describe('Previous page number, or null when this is the first page.'),
        next_page: z.number().nullable().describe('Next page number, or null when this is the last page.')
    })
    .describe("A single page of the current user's WakaTime projects with pagination metadata.");

/**
 * @tags: [read]
 * @tagReason: Reads the current user's project list from WakaTime without modifying any provider state.
 * @pitfalls: Projects are auto-derived from heartbeat data, so a project for a just-submitted heartbeat may not be listed until WakaTime finishes background processing; first_heartbeat_at and human_readable_first_heartbeat_at are only populated for accounts created after 2024-02-05 and are otherwise null or absent.
 */
const action = createAction({
    description: 'List all projects WakaTime has recorded activity for (auto-created from heartbeats).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://wakatime.com/developers#projects
            endpoint: '/api/v1/users/current/projects',
            params: {
                ...(input.page !== undefined && { page: input.page })
            },
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);

        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
