import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    projects: z.array(z.string())
});

const CheckpointSchema = z.object({
    state: z.string(),
    fullCrawlDone: z.boolean()
});

const WorkItemSchema = z.object({
    id: z.string(),
    project: z.string().optional(),
    url: z.string().optional(),
    type: z.string().optional(),
    state: z.string().optional(),
    title: z.string().optional(),
    createdDate: z.string().optional(),
    changedDate: z.string().optional(),
    fields: z.record(z.string(), z.unknown()).optional()
});

const WiqlResponseSchema = z.object({
    workItems: z
        .array(
            z.object({
                id: z.number(),
                url: z.string().optional()
            })
        )
        .optional()
});

const WorkItemsResponseSchema = z.object({
    value: z
        .array(
            z.object({
                id: z.number(),
                rev: z.number().optional(),
                url: z.string().optional(),
                fields: z.record(z.string(), z.unknown()).optional()
            })
        )
        .optional()
});

const sync = createSync({
    description: 'Sync work items using WIQL ChangedDate filter, then hydrate fields in batches',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    endpoints: [{ method: 'GET', path: '/syncs/work-items' }],
    models: {
        WorkItem: WorkItemSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(metadata);
        if (!metadataResult.success) {
            throw new Error('Metadata must include a projects array');
        }
        const projects = metadataResult.data.projects;

        const checkpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(checkpoint);
        const currentCheckpoint = checkpointResult.success ? checkpointResult.data : { state: '', fullCrawlDone: false };
        const shouldRunFullCrawl = !currentCheckpoint.fullCrawlDone;

        let projectState: Record<string, { changedAfter?: string }> = {};
        if (currentCheckpoint.state) {
            // @allowTryCatch: JSON.parse may throw if the checkpoint state string is corrupted; we gracefully fall back to an empty state.
            try {
                const parsed = JSON.parse(currentCheckpoint.state);
                if (typeof parsed === 'object' && parsed !== null) {
                    projectState = parsed;
                }
            } catch {
                // ignore invalid JSON
            }
        }

        const updatedProjectState: Record<string, { changedAfter?: string }> = shouldRunFullCrawl ? {} : { ...projectState };

        // Only the initial unconstrained crawl is complete enough to support delete tracking.
        if (shouldRunFullCrawl) {
            await nango.trackDeletesStart('WorkItem');
        }

        for (const project of projects) {
            const projectCheckpoint = shouldRunFullCrawl ? undefined : projectState[project]?.changedAfter;
            let hasMore = true;
            let lastChangedDate: string | undefined = projectCheckpoint;
            let lastPageLastId: number | undefined;

            while (hasMore) {
                let query = 'SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project';
                const parameters: Record<string, string> = { project };

                if (lastChangedDate) {
                    if (lastPageLastId !== undefined) {
                        query += ` AND ([System.ChangedDate] > @checkpoint OR ([System.ChangedDate] = @checkpoint AND [System.Id] > ${lastPageLastId}))`;
                    } else {
                        query += ' AND [System.ChangedDate] > @checkpoint';
                    }
                    parameters['checkpoint'] = lastChangedDate;
                }

                query += ' ORDER BY [System.ChangedDate] ASC, [System.Id] ASC';

                // https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/wiql/query-by-wiql?view=azure-devops-rest-7.2
                const wiqlResponse = await nango.post({
                    endpoint: `/${encodeURIComponent(project)}/_apis/wit/wiql`,
                    params: {
                        'api-version': '7.2-preview.2',
                        $top: '20000'
                    },
                    data: {
                        query,
                        parameters
                    },
                    retries: 3
                });

                const wiqlResult = WiqlResponseSchema.safeParse(wiqlResponse.data);
                if (!wiqlResult.success) {
                    throw new Error(`Failed to parse WIQL response for project ${project}`);
                }

                const workItemIds = wiqlResult.data.workItems ?? [];
                if (workItemIds.length === 0) {
                    hasMore = false;
                    lastPageLastId = undefined;
                    break;
                }

                const ids = workItemIds.map((item) => item.id);
                const lastWiqlId = ids[ids.length - 1];
                const batchSize = 200;
                const allWorkItems: Array<{
                    id: string;
                    project: string | undefined;
                    url: string | undefined;
                    type: string | undefined;
                    state: string | undefined;
                    title: string | undefined;
                    createdDate: string | undefined;
                    changedDate: string | undefined;
                    fields: Record<string, unknown> | undefined;
                }> = [];

                for (let i = 0; i < ids.length; i += batchSize) {
                    const batchIds = ids.slice(i, i + batchSize);
                    const batchIdString = batchIds.join(',');

                    // https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/get-work-items?view=azure-devops-rest-7.2
                    const workItemsResponse = await nango.get({
                        endpoint: `/${encodeURIComponent(project)}/_apis/wit/workitems`,
                        params: {
                            ids: batchIdString,
                            $expand: 'all',
                            'api-version': '7.2-preview.3'
                        },
                        retries: 3
                    });

                    const workItemsResult = WorkItemsResponseSchema.safeParse(workItemsResponse.data);
                    if (!workItemsResult.success) {
                        throw new Error(`Failed to parse work items response for project ${project}`);
                    }

                    const batchWorkItems = workItemsResult.data.value ?? [];
                    for (const item of batchWorkItems) {
                        const fields = item.fields ?? {};
                        allWorkItems.push({
                            id: String(item.id),
                            project: typeof fields['System.TeamProject'] === 'string' ? fields['System.TeamProject'] : project,
                            url: typeof item.url === 'string' ? item.url : undefined,
                            type: typeof fields['System.WorkItemType'] === 'string' ? fields['System.WorkItemType'] : undefined,
                            state: typeof fields['System.State'] === 'string' ? fields['System.State'] : undefined,
                            title: typeof fields['System.Title'] === 'string' ? fields['System.Title'] : undefined,
                            createdDate: typeof fields['System.CreatedDate'] === 'string' ? fields['System.CreatedDate'] : undefined,
                            changedDate: typeof fields['System.ChangedDate'] === 'string' ? fields['System.ChangedDate'] : undefined,
                            fields
                        });
                    }
                }

                if (allWorkItems.length > 0) {
                    await nango.batchSave(allWorkItems, 'WorkItem');
                    const lastItem = allWorkItems[allWorkItems.length - 1];
                    if (lastItem !== undefined && lastItem.changedDate) {
                        lastChangedDate = lastItem.changedDate;
                    }
                    lastPageLastId = lastWiqlId;
                }

                if (workItemIds.length < 20000) {
                    hasMore = false;
                    lastPageLastId = undefined;
                }
            }

            if (lastChangedDate !== undefined) {
                updatedProjectState[project] = { changedAfter: lastChangedDate };
            } else {
                updatedProjectState[project] = {};
            }

            if (!shouldRunFullCrawl) {
                await nango.saveCheckpoint({
                    state: JSON.stringify(updatedProjectState),
                    fullCrawlDone: true
                });
            }
        }

        if (shouldRunFullCrawl) {
            await nango.trackDeletesEnd('WorkItem');
        }

        await nango.saveCheckpoint({
            state: JSON.stringify(updatedProjectState),
            fullCrawlDone: true
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
