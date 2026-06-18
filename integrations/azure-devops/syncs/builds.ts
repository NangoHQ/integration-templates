import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    projects: z.array(z.string()).optional()
});

const ProviderDefinitionSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional()
});

const ProviderProjectSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional()
});

const ProviderRequestedBySchema = z.object({
    id: z.string().optional(),
    displayName: z.string().optional()
});

const ProviderBuildSchema = z
    .object({
        id: z.union([z.number(), z.string()]),
        buildNumber: z.string().nullish(),
        status: z.string().nullish(),
        result: z.string().nullish(),
        queueTime: z.string().nullish(),
        startTime: z.string().nullish(),
        finishTime: z.string().nullish(),
        sourceBranch: z.string().nullish(),
        sourceVersion: z.string().nullish(),
        url: z.string().nullish(),
        definition: ProviderDefinitionSchema.nullish(),
        project: ProviderProjectSchema.nullish(),
        requestedBy: ProviderRequestedBySchema.nullish()
    })
    .passthrough();

const ProviderBuildsResponseSchema = z.object({
    value: z.array(ProviderBuildSchema).optional()
});

const ProviderProjectItemSchema = z.object({
    id: z.string().optional(),
    name: z.string()
});

const ProviderProjectsResponseSchema = z.object({
    value: z.array(ProviderProjectItemSchema).optional()
});

const BuildSchema = z.object({
    id: z.string().describe('Build ID'),
    buildNumber: z.string().optional(),
    status: z.string().optional(),
    result: z.string().optional(),
    queueTime: z.string().optional(),
    startTime: z.string().optional(),
    finishTime: z.string().optional(),
    sourceBranch: z.string().optional(),
    sourceVersion: z.string().optional(),
    url: z.string().optional(),
    definition: z
        .object({
            id: z.number().optional(),
            name: z.string().optional()
        })
        .optional(),
    project: z
        .object({
            id: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    requestedBy: z
        .object({
            id: z.string().optional(),
            displayName: z.string().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync builds with incremental time-based filtering.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Build: BuildSchema
    },
    endpoints: [
        {
            path: '/syncs/builds',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();
        const checkpoint = await nango.getCheckpoint();

        let projects: string[] = [];
        if (metadata?.projects && metadata.projects.length > 0) {
            projects = metadata.projects;
        } else {
            // https://learn.microsoft.com/en-us/rest/api/azure/devops/core/projects/list
            const projectsResponse = await nango.get({
                endpoint: '/_apis/projects',
                params: {
                    'api-version': '7.2-preview.4'
                },
                retries: 3
            });
            const parsedProjects = ProviderProjectsResponseSchema.safeParse(projectsResponse.data);
            if (!parsedProjects.success) {
                throw new Error(`Failed to parse projects response: ${parsedProjects.error.message}`);
            }
            projects = (parsedProjects.data.value ?? []).map((p) => p.name);
        }

        if (projects.length === 0) {
            throw new Error('No projects found');
        }

        for (const project of projects) {
            let continuationToken: string | undefined;
            let lastQueueTime: string | undefined;

            do {
                const params: Record<string, string | number> = {
                    queryOrder: 'queueTimeAscending',
                    'api-version': '7.2-preview.7'
                };
                if (checkpoint && checkpoint['updated_after']) {
                    params['minTime'] = checkpoint['updated_after'];
                }
                if (continuationToken) {
                    params['continuationToken'] = continuationToken;
                }

                // https://learn.microsoft.com/en-us/rest/api/azure/devops/build/builds/list
                const response = await nango.get({
                    endpoint: `/${encodeURIComponent(project)}/_apis/build/builds`,
                    params,
                    retries: 3
                });

                const parsed = ProviderBuildsResponseSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error(`Failed to parse builds response: ${parsed.error.message}`);
                }

                const builds = parsed.data.value ?? [];
                if (builds.length === 0) {
                    break;
                }

                const mappedBuilds = builds.map((build) => {
                    const mapped: z.infer<typeof BuildSchema> = {
                        id: String(build.id)
                    };
                    if (build.buildNumber != null) {
                        mapped.buildNumber = build.buildNumber;
                    }
                    if (build.status != null) {
                        mapped.status = build.status;
                    }
                    if (build.result != null) {
                        mapped.result = build.result;
                    }
                    if (build.queueTime != null) {
                        mapped.queueTime = build.queueTime;
                    }
                    if (build.startTime != null) {
                        mapped.startTime = build.startTime;
                    }
                    if (build.finishTime != null) {
                        mapped.finishTime = build.finishTime;
                    }
                    if (build.sourceBranch != null) {
                        mapped.sourceBranch = build.sourceBranch;
                    }
                    if (build.sourceVersion != null) {
                        mapped.sourceVersion = build.sourceVersion;
                    }
                    if (build.url != null) {
                        mapped.url = build.url;
                    }
                    if (build.definition != null) {
                        mapped.definition = {
                            ...(build.definition.id !== undefined && { id: build.definition.id }),
                            ...(build.definition.name !== undefined && { name: build.definition.name })
                        };
                    }
                    if (build.project != null) {
                        mapped.project = {
                            ...(build.project.id !== undefined && { id: build.project.id }),
                            ...(build.project.name !== undefined && { name: build.project.name })
                        };
                    }
                    if (build.requestedBy != null) {
                        mapped.requestedBy = {
                            ...(build.requestedBy.id !== undefined && { id: build.requestedBy.id }),
                            ...(build.requestedBy.displayName !== undefined && { displayName: build.requestedBy.displayName })
                        };
                    }
                    return mapped;
                });

                await nango.batchSave(mappedBuilds, 'Build');

                const lastBuild = builds[builds.length - 1];
                if (lastBuild && lastBuild.queueTime != null) {
                    lastQueueTime = lastBuild.queueTime;
                }

                continuationToken = response.headers?.['x-ms-continuationtoken'];
            } while (continuationToken);

            if (lastQueueTime) {
                await nango.saveCheckpoint({ updated_after: lastQueueTime });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
