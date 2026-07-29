import { createSync } from 'nango';
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

const WorkspaceArraySchema = z.array(
    z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .passthrough()
);

const WorkspaceListSchema = z.object({
    value: WorkspaceArraySchema
});

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
    workspaceOffset: z.number().int().nonnegative(),
    workspaceId: z.string(),
    datasetOffset: z.number().int().nonnegative()
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
        let resumeWorkspaceId = checkpoint?.workspaceId || undefined;
        let resumeDatasetOffset = checkpoint?.datasetOffset ?? 0;

        // Full refresh: Power BI exposes offset pagination for workspaces and datasets, but no changed-since filter.
        await nango.trackDeletesStart('Dataset');

        while (true) {
            const workspaceResponse = await nango.get({
                // https://learn.microsoft.com/en-us/rest/api/power-bi/groups/get-groups
                endpoint: '/v1.0/myorg/groups',
                params: {
                    $top: PAGE_SIZE,
                    ...(workspaceOffset > 0 ? { $skip: workspaceOffset } : {})
                },
                retries: 3
            });

            const parsedWorkspaces = WorkspaceListSchema.safeParse(workspaceResponse.data);
            if (!parsedWorkspaces.success) {
                throw new Error(`Failed to parse workspaces response: ${parsedWorkspaces.error.message}`);
            }

            const workspaces = parsedWorkspaces.data.value;
            if (workspaces.length === 0) {
                break;
            }

            let startIndex = 0;
            if (resumeWorkspaceId) {
                const resumeIndex = workspaces.findIndex((workspace) => workspace.id === resumeWorkspaceId);
                if (resumeIndex >= 0) {
                    startIndex = resumeIndex;
                } else {
                    resumeWorkspaceId = undefined;
                    resumeDatasetOffset = 0;
                }
            }

            for (let index = startIndex; index < workspaces.length; index++) {
                const workspace = workspaces[index]!;
                const workspaceId = workspace.id;
                let datasetOffset = workspaceId === resumeWorkspaceId ? resumeDatasetOffset : 0;

                while (true) {
                    const datasetResponse = await nango.get({
                        // https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/get-datasets
                        endpoint: `/v1.0/myorg/groups/${encodeURIComponent(workspaceId)}/datasets`,
                        params: {
                            $top: PAGE_SIZE,
                            ...(datasetOffset > 0 ? { $skip: datasetOffset } : {})
                        },
                        retries: 3
                    });

                    const parsedDatasets = DatasetListSchema.safeParse(datasetResponse.data);
                    if (!parsedDatasets.success) {
                        throw new Error(`Failed to parse datasets response for workspace ${workspaceId}: ${parsedDatasets.error.message}`);
                    }

                    const rawDatasets = parsedDatasets.data.value;
                    const datasets = rawDatasets.map((raw) => ({
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

                    if (rawDatasets.length === PAGE_SIZE) {
                        datasetOffset += rawDatasets.length;
                        await nango.saveCheckpoint({
                            workspaceOffset,
                            workspaceId,
                            datasetOffset
                        });
                        continue;
                    }

                    const nextWorkspace = workspaces[index + 1];
                    await nango.saveCheckpoint(
                        nextWorkspace
                            ? {
                                  workspaceOffset,
                                  workspaceId: nextWorkspace.id,
                                  datasetOffset: 0
                              }
                            : {
                                  workspaceOffset: workspaceOffset + workspaces.length,
                                  workspaceId: '',
                                  datasetOffset: 0
                              }
                    );
                    break;
                }

                resumeWorkspaceId = undefined;
                resumeDatasetOffset = 0;
            }

            workspaceOffset += workspaces.length;

            if (workspaces.length < PAGE_SIZE) {
                break;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Dataset');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
