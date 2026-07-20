import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const WorkflowSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    status: z.string().optional()
});

const ProviderWorkflowSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    version: z.number().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    locationId: z.string().optional()
});

const WorkflowsResponseSchema = z.object({
    workflows: z.array(ProviderWorkflowSchema)
});

const MetadataSchema = z.object({
    locationId: z.string().optional()
});

const sync = createSync({
    description: 'Sync workflow definitions (id, name, status) from HighLevel.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Workflow: WorkflowSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes GET /workflows/ with no changed-since filter,
        // no deleted-record endpoint, no resumable cursor, and no pagination.
        const connection = await nango.getConnection();
        const connectionSchema = z.object({
            connection_config: z.record(z.string(), z.unknown()).optional(),
            metadata: z.record(z.string(), z.unknown()).optional()
        });
        const parsedConnection = connectionSchema.safeParse(connection);

        let rawLocationId = parsedConnection.success
            ? (parsedConnection.data.connection_config?.['locationId'] ?? parsedConnection.data.metadata?.['locationId'])
            : undefined;
        if (typeof rawLocationId !== 'string') {
            const metadata = await nango.getMetadata();
            const parsedMetadata = MetadataSchema.safeParse(metadata);
            if (parsedMetadata.success) {
                rawLocationId = parsedMetadata.data.locationId;
            }
        }
        if (typeof rawLocationId !== 'string') {
            throw new Error('locationId is required in connection configuration or metadata');
        }
        const locationId = rawLocationId;

        const config: ProxyConfiguration = {
            // https://highlevel.stoplight.io/docs/integrations/get-workflow
            endpoint: '/workflows/',
            params: {
                locationId
            },
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = WorkflowsResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse workflows response: ${parsed.error.message}`);
        }

        // trackDeletesStart is deferred until after the response is validated so a request
        // or parse failure never leaves delete-tracking open without a matching End.
        await nango.trackDeletesStart('Workflow');

        const workflows = parsed.data.workflows.map((workflow) => ({
            id: workflow.id,
            ...(workflow.name != null && { name: workflow.name }),
            ...(workflow.status != null && { status: workflow.status })
        }));

        if (workflows.length > 0) {
            await nango.batchSave(workflows, 'Workflow');
        }

        await nango.trackDeletesEnd('Workflow');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
