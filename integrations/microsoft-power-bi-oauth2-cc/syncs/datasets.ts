import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PAGE_SIZE = 100;

const DatasetSchema = z.object({
    id: z.string(),
    datasetId: z.string(),
    workspaceId: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    configuredBy: z.string().optional(),
    isRefreshable: z.boolean().optional(),
    isEffectiveIdentityRequired: z.boolean().optional(),
    isOnPremGatewayRequired: z.boolean().optional(),
    addRowsAPIEnabled: z.boolean().optional(),
    webUrl: z.string().optional(),
    createdDate: z.string().optional()
});

const WorkspaceSchema = z
    .object({
        id: z.string(),
        name: z.string().optional()
    })
    .passthrough();

const DatasetArraySchema = z.array(
    z
        .object({
            id: z.string(),
            name: z.string(),
            description: z.string().nullish(),
            configuredBy: z.string().nullish(),
            isRefreshable: z.boolean().nullish(),
            isEffectiveIdentityRequired: z.boolean().nullish(),
            isOnPremGatewayRequired: z.boolean().nullish(),
            addRowsAPIEnabled: z.boolean().nullish(),
            webUrl: z.string().nullish(),
            createdDate: z.string().nullish()
        })
        .passthrough()
);

const DatasetListSchema = z.object({
    value: DatasetArraySchema
});

const CheckpointSchema = z.object({
    workspaceOffset: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Sync datasets across all workspaces accessible to this service principal.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Dataset: DatasetSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : null;
        let workspaceOffset = checkpoint?.workspaceOffset ?? 0;

        // Full refresh: Power BI groups has no changed-since filter, but $skip/$top lets us resume an interrupted scan.
        await nango.trackDeletesStart('Dataset');

        const workspacesConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/rest/api/power-bi/groups/get-groups
            endpoint: '/v1.0/myorg/groups',
            params: {
                $top: PAGE_SIZE
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_start_value: workspaceOffset,
                limit_name_in_request: '$top',
                limit: PAGE_SIZE,
                response_path: 'value'
            },
            retries: 3
        };

        for await (const workspacePage of nango.paginate(workspacesConfig)) {
            const workspaces = workspacePage.map((raw) => WorkspaceSchema.parse(raw));

            for (const workspace of workspaces) {
                const workspaceId = workspace.id;

                // Get Datasets In Group documents only the groupId path parameter (no $top/$skip),
                // and returns the full dataset list for the workspace in a single response.
                // https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/get-datasets-in-group
                const datasetResponse = await nango.get({
                    endpoint: `/v1.0/myorg/groups/${encodeURIComponent(workspaceId)}/datasets`,
                    retries: 3
                });

                const parsedDatasets = DatasetListSchema.safeParse(datasetResponse.data);
                if (!parsedDatasets.success) {
                    throw new Error(`Failed to parse datasets response for workspace ${workspaceId}: ${parsedDatasets.error.message}`);
                }

                const datasets = parsedDatasets.data.value.map((raw) => ({
                    id: `${workspaceId}:${raw.id}`,
                    datasetId: raw.id,
                    workspaceId: workspaceId,
                    name: raw.name,
                    ...(raw.description != null && { description: raw.description }),
                    ...(raw.configuredBy != null && { configuredBy: raw.configuredBy }),
                    ...(raw.isRefreshable != null && { isRefreshable: raw.isRefreshable }),
                    ...(raw.isEffectiveIdentityRequired != null && { isEffectiveIdentityRequired: raw.isEffectiveIdentityRequired }),
                    ...(raw.isOnPremGatewayRequired != null && { isOnPremGatewayRequired: raw.isOnPremGatewayRequired }),
                    ...(raw.addRowsAPIEnabled != null && { addRowsAPIEnabled: raw.addRowsAPIEnabled }),
                    ...(raw.webUrl != null && { webUrl: raw.webUrl }),
                    ...(raw.createdDate != null && { createdDate: raw.createdDate })
                }));

                if (datasets.length > 0) {
                    await nango.batchSave(datasets, 'Dataset');
                }
            }

            workspaceOffset += workspaces.length;
            await nango.saveCheckpoint({ workspaceOffset });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Dataset');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
