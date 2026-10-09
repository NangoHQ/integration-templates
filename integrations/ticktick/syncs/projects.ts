import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().nullish(),
    sortOrder: z.number().nullish(),
    closed: z.boolean().nullish(),
    groupId: z.string().nullish(),
    viewMode: z.string().nullish(),
    permission: z.string().nullish(),
    kind: z.string().nullish()
});

const ProjectSchema = z
    .object({
        id: z.string().describe('Unique identifier of the project (list).'),
        name: z.string().describe('Display name of the project (list).'),
        color: z.string().optional().describe('Hex color assigned to the project, for example "#F18181".'),
        sortOrder: z.number().optional().describe('Sort order of the project within the account.'),
        closed: z.boolean().optional().describe('Whether the project is closed (archived).'),
        groupId: z.string().optional().describe('Identifier of the project group this project belongs to, when it is grouped.'),
        viewMode: z.string().optional().describe('Default view mode of the project: "list", "kanban", or "timeline".'),
        permission: z.string().optional().describe('The current user\'s permission on the project: "read", "write", or "comment".'),
        kind: z.string().optional().describe('Kind of project: "TASK" or "NOTE".')
    })
    .describe('A TickTick project (list) that groups related tasks.');

const sync = createSync({
    description: "Sync all of the user's TickTick projects (lists), removing any project deleted since the previous run.",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['tasks:read'],
    models: {
        Project: ProjectSchema
    },

    exec: async (nango) => {
        // Full refresh: Project objects expose no modified/created timestamp and the API offers no
        // changed-since filter, so every run re-fetches the whole (small) list. Deletion detection is
        // handled with trackDeletesStart/trackDeletesEnd. No checkpoint is persisted mid-scan because
        // the delete-tracked scan must always restart from the first page.
        await nango.trackDeletesStart('Project');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.ticktick.com/docs/openapi.md#get-user-project
            endpoint: '/open/v1/project',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 200
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            const parsed = ProviderProjectSchema.array().parse(page);

            const projects = parsed.map((record) => ({
                id: record.id,
                name: record.name,
                ...(record.color != null && { color: record.color }),
                ...(record.sortOrder != null && { sortOrder: record.sortOrder }),
                ...(record.closed != null && { closed: record.closed }),
                ...(record.groupId != null && { groupId: record.groupId }),
                ...(record.viewMode != null && { viewMode: record.viewMode }),
                ...(record.permission != null && { permission: record.permission }),
                ...(record.kind != null && { kind: record.kind })
            }));

            if (projects.length > 0) {
                await nango.batchSave(projects, 'Project');
            }
        }

        await nango.trackDeletesEnd('Project');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
