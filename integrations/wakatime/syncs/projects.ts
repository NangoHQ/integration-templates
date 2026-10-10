import { createSync, type ProxyConfiguration } from 'nango';
import * as z from 'zod';

const ProjectSchema = z
    .object({
        id: z.string().describe('Unique WakaTime project id.'),
        name: z.string().describe('Project name as derived from heartbeat entities.'),
        repository: z.string().nullable().optional().describe('URL of the associated repository, or null when no repository is connected.'),
        badge: z.string().nullable().optional().describe('URL of the project badge when enabled, or null otherwise.'),
        color: z.string().nullable().optional().describe('Custom project color as a hex string, or null when the default color is used.'),
        clients: z.array(z.string()).optional().describe('Names of the WakaTime clients (editors/plugins) that logged time against this project.'),
        has_public_url: z.boolean().optional().describe('Whether this project has a shareable public URL.'),
        human_readable_last_heartbeat_at: z
            .string()
            .nullable()
            .optional()
            .describe('Human-readable time when the project last received code stats; null when the project has no heartbeats.'),
        last_heartbeat_at: z
            .string()
            .nullable()
            .optional()
            .describe('ISO 8601 time when the project last received code stats; null when the project has no heartbeats.'),
        human_readable_first_heartbeat_at: z
            .string()
            .nullable()
            .optional()
            .describe('Human-readable time when the project first received code stats; null for accounts created before 2024-02-05.'),
        first_heartbeat_at: z
            .string()
            .nullable()
            .optional()
            .describe('ISO 8601 time when the project first received code stats; null for accounts created before 2024-02-05.'),
        url: z.string().optional().describe('Path of this project relative to wakatime.com.'),
        urlencoded_name: z.string().optional().describe('URL-encoded project name.'),
        created_at: z.string().optional().describe('ISO 8601 time when the project was created.')
    })
    .describe("A WakaTime project derived from the user's heartbeat history.");

const CheckpointSchema = z.object({
    page: z.number().int().positive().describe('Next page number to fetch when resuming an interrupted full scan.')
});

const sync = createSync({
    description: "Sync all projects WakaTime has derived from the user's heartbeat history.",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    scopes: ['read_stats.projects'],
    models: {
        Project: ProjectSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = rawCheckpoint == null ? null : CheckpointSchema.safeParse(rawCheckpoint);

        if (checkpointResult && !checkpointResult.success) {
            throw new Error(`Invalid projects sync checkpoint: ${checkpointResult.error.message}`);
        }

        let page = checkpointResult?.data.page;
        const startingFresh = page == null;

        // Full refresh: the projects endpoint has no changed-since filter, and this
        // account's projects can genuinely be deleted (see the delete-project action).
        // Page-based checkpointing only resumes an interrupted full scan; delete
        // tracking still only runs on fresh scans from page 1.
        if (startingFresh) {
            await nango.trackDeletesStart('Project');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://wakatime.com/developers#projects
            endpoint: '/api/v1/users/current/projects',
            params: {
                ...(page != null && { page })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'page',
                cursor_path_in_response: 'next_page',
                response_path: 'data',
                limit_name_in_request: 'per_page',
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageRecords of nango.paginate<unknown>(proxyConfig)) {
            const projects = pageRecords.map((record) => ProjectSchema.parse(record));

            if (projects.length > 0) {
                await nango.batchSave(projects, 'Project');
            }

            if (page != null) {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.clearCheckpoint();

        if (startingFresh) {
            await nango.trackDeletesEnd('Project');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
