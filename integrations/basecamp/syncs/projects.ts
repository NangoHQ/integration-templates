import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProjectClientCompanySchema = z.object({
    id: z.number().describe('Unique identifier of the client company.'),
    name: z.string().describe('Name of the client company.')
});

const ProjectClientsideSchema = z.object({
    url: z.string().describe('API URL for the client board.'),
    app_url: z.string().describe('Basecamp web app URL for the client board.')
});

const ProjectSchema = z
    .object({
        id: z.string().describe('Unique identifier for the project.'),
        name: z.string().describe('Name of the project.'),
        description: z.string().optional().describe('Description of the project.'),
        status: z.string().describe('Status of the project: active, archived, or trashed.'),
        created_at: z.string().describe('ISO 8601 timestamp when the project was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the project was last updated.'),
        url: z.string().describe('API URL for the project.'),
        app_url: z.string().describe('Basecamp web app URL for the project.'),
        purpose: z.string().optional().describe('Purpose of the project, e.g. "topic".'),
        clients_enabled: z.boolean().optional().describe('Whether client access is enabled for this project.'),
        timesheet_enabled: z.boolean().optional().describe('Whether timesheets are enabled for this project.'),
        color: z.string().optional().describe('Color associated with the project, if any.'),
        all_access: z.boolean().optional().describe('Whether the project is visible to all account members.'),
        bookmarked: z.boolean().optional().describe('Whether the current user has bookmarked the project.'),
        draft: z.boolean().optional().describe('Whether the project is a draft.'),
        template: z.boolean().optional().describe('Whether the project is a template.'),
        client_company: ProjectClientCompanySchema.optional().describe('Client company associated with the project, if any.'),
        clientside: ProjectClientsideSchema.optional().describe('Client-side board URLs for the project, if any.')
    })
    .describe('A Basecamp project.');

const CheckpointSchema = z
    .object({
        nextStatusIndex: z.number().int().min(0).max(2).describe('Index of the next project status to fetch (0=active, 1=archived, 2=trashed).')
    })
    .describe('Checkpoint for resuming a full-refresh project crawl across status filters.');

const ProviderClientCompanySchema = z.object({
    id: z.number(),
    name: z.string()
});

const ProviderClientsideSchema = z.object({
    url: z.string(),
    app_url: z.string()
});

const ProviderProjectSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    url: z.string(),
    app_url: z.string(),
    purpose: z.string().optional(),
    clients_enabled: z.boolean().optional(),
    timesheet_enabled: z.boolean().optional(),
    color: z.string().nullable().optional(),
    all_access: z.boolean().optional(),
    bookmarked: z.boolean().optional(),
    draft: z.boolean().optional(),
    template: z.boolean().optional(),
    client_company: ProviderClientCompanySchema.optional(),
    clientside: ProviderClientsideSchema.optional()
});

function parseProject(raw: unknown): z.infer<typeof ProjectSchema> {
    const parsed = ProviderProjectSchema.parse(raw);
    return {
        id: String(parsed.id),
        name: parsed.name,
        ...(parsed.description != null && { description: parsed.description }),
        status: parsed.status,
        created_at: parsed.created_at,
        updated_at: parsed.updated_at,
        url: parsed.url,
        app_url: parsed.app_url,
        ...(parsed.purpose !== undefined && { purpose: parsed.purpose }),
        ...(parsed.clients_enabled !== undefined && { clients_enabled: parsed.clients_enabled }),
        ...(parsed.timesheet_enabled !== undefined && { timesheet_enabled: parsed.timesheet_enabled }),
        ...(parsed.color !== null && parsed.color !== undefined && { color: parsed.color }),
        ...(parsed.all_access !== undefined && { all_access: parsed.all_access }),
        ...(parsed.bookmarked !== undefined && { bookmarked: parsed.bookmarked }),
        ...(parsed.draft !== undefined && { draft: parsed.draft }),
        ...(parsed.template !== undefined && { template: parsed.template }),
        ...(parsed.client_company !== undefined && { client_company: parsed.client_company }),
        ...(parsed.clientside !== undefined && { clientside: parsed.clientside })
    };
}

const sync = createSync({
    description: 'Sync projects.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Project: ProjectSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const allStatuses = ['active', 'archived', 'trashed'];
        // Reject a checkpoint whose nextStatusIndex is missing, non-integer, or out of range
        // rather than let slice() silently produce an empty statuses list, which would still
        // close out delete tracking below and delete every stored Project.
        const parsedCheckpoint = checkpoint != null ? CheckpointSchema.safeParse(checkpoint) : undefined;
        const startIndex = parsedCheckpoint?.success ? parsedCheckpoint.data.nextStatusIndex : 0;
        const statuses = allStatuses.slice(startIndex);

        await nango.trackDeletesStart('Project');

        for (const status of statuses) {
            const params: Record<string, string> = {};
            if (status !== 'active') {
                params['status'] = status;
            }

            const proxyConfig: ProxyConfiguration = {
                // https://github.com/basecamp/bc3-api/blob/master/sections/projects.md
                endpoint: '/projects.json',
                params,
                paginate: {
                    type: 'link',
                    link_rel_in_response_header: 'next',
                    limit: 15,
                    limit_name_in_request: 'limit'
                },
                retries: 3
            };

            const projects: Array<z.infer<typeof ProjectSchema>> = [];

            for await (const page of nango.paginate<unknown>(proxyConfig)) {
                for (const raw of page) {
                    const project = parseProject(raw);
                    projects.push(project);
                }
            }

            if (projects.length > 0) {
                await nango.batchSave(projects, 'Project');
            }

            const nextStatusIndex = allStatuses.indexOf(status) + 1;
            if (nextStatusIndex < allStatuses.length) {
                await nango.saveCheckpoint({ nextStatusIndex });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Project');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
