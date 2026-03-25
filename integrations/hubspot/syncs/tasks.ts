import { createSync } from 'nango';
import { z } from 'zod';

const TaskSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    title: z.string().optional(),
    priority: z.string().optional(),
    assigneeId: z.string().optional(),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
    contactIds: z.array(z.string()),
    companyIds: z.array(z.string()),
    dealIds: z.array(z.string()),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const AssociationResultSchema = z.object({
    results: z.array(z.object({ id: z.string() })).optional()
});

const TaskApiSchema = z.object({
    id: z.string(),
    properties: z
        .object({
            hs_task_type: z.string().nullish(),
            hs_task_subject: z.string().nullish(),
            hs_task_priority: z.string().nullish(),
            hs_task_assignee: z.string().nullish(),
            hs_task_due_date: z.string().nullish(),
            hs_task_notes: z.string().nullish(),
            hs_createdate: z.string().nullish(),
            hs_lastmodifieddate: z.string().nullish()
        })
        .nullish(),
    associations: z
        .object({
            contacts: AssociationResultSchema.optional(),
            companies: AssociationResultSchema.optional(),
            deals: AssociationResultSchema.optional()
        })
        .partial()
        .optional(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish()
});

const TaskResponseSchema = z.object({
    results: z.array(TaskApiSchema).optional(),
    paging: z
        .object({
            next: z
                .object({
                    after: z.string()
                })
                .optional()
        })
        .optional()
});

const HubspotCrmCheckpointSchema = z.object({
    phase: z.string(),
    after: z.string(),
    updatedAfter: z.string()
});

type HubspotCrmCheckpoint = {
    phase: 'initial' | 'incremental';
    after?: string;
    updatedAfter?: string;
};

type AssociationClient = {
    get: (config: { endpoint: string; retries: number }) => Promise<{ data: unknown }>;
};

function parseHubspotCrmCheckpoint(value: unknown): HubspotCrmCheckpoint | undefined {
    const result = HubspotCrmCheckpointSchema.safeParse(value);
    if (!result.success) {
        return undefined;
    }

    const { phase, after, updatedAfter } = result.data;
    if (phase !== 'initial' && phase !== 'incremental') {
        return undefined;
    }

    const checkpoint: HubspotCrmCheckpoint = { phase };

    if (after) {
        checkpoint.after = after;
    }

    if (updatedAfter) {
        checkpoint.updatedAfter = updatedAfter;
    }

    return checkpoint;
}

function updateLatestUpdatedAt(current: string | undefined, candidate: string | null | undefined): string | undefined {
    if (!candidate) {
        return current;
    }

    return !current || candidate > current ? candidate : current;
}

async function fetchAssociatedIds(client: AssociationClient, taskId: string, association: 'contacts' | 'companies' | 'deals'): Promise<string[]> {
    // https://developers.hubspot.com/docs/reference/api/crm/associations/associations
    // @allowTryCatch Associations can be absent for a task; treat that as an empty list.
    try {
        const response = await client.get({
            endpoint: `/crm/v3/objects/tasks/${taskId}/associations/${association}`,
            retries: 3
        });

        return (AssociationResultSchema.parse(response.data).results || []).map((result) => result.id);
    } catch {
        return [];
    }
}

const sync = createSync({
    description: 'Sync tasks with type, title, priority, assignee, due date, notes, and related contacts, companies, and deals',
    version: '3.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/tasks', group: 'Tasks' }],
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: HubspotCrmCheckpointSchema,

    models: {
        Task: TaskSchema
    },

    exec: async (nango) => {
        const checkpoint = parseHubspotCrmCheckpoint(await nango.getCheckpoint());
        const shouldUseInitialListSync = checkpoint?.phase !== 'incremental' || !checkpoint.updatedAfter;

        if (shouldUseInitialListSync) {
            let after = checkpoint?.after;
            let latestUpdatedAt = checkpoint?.updatedAfter;
            let hasMore = true;

            while (hasMore) {
                // https://developers.hubspot.com/docs/api-reference/crm-tasks-v3/basic/get-crm-v3-objects-tasks
                const response = await nango.get({
                    endpoint: '/crm/v3/objects/tasks',
                    params: {
                        limit: '100',
                        properties:
                            'hs_task_type,hs_task_subject,hs_task_priority,hs_task_assignee,hs_task_due_date,hs_task_notes,hs_createdate,hs_lastmodifieddate',
                        associations: 'contacts,companies,deals',
                        ...(after && { after })
                    },
                    retries: 3
                });

                const data = TaskResponseSchema.parse(response.data);
                const tasks = data.results || [];

                if (tasks.length === 0) {
                    break;
                }

                const records = tasks.map((task) => ({
                    id: task.id,
                    type: task.properties?.['hs_task_type'] ?? undefined,
                    title: task.properties?.['hs_task_subject'] ?? undefined,
                    priority: task.properties?.['hs_task_priority'] ?? undefined,
                    assigneeId: task.properties?.['hs_task_assignee'] ?? undefined,
                    dueDate: task.properties?.['hs_task_due_date'] ?? undefined,
                    notes: task.properties?.['hs_task_notes'] ?? undefined,
                    contactIds: (task.associations?.contacts?.results || []).map((association) => association.id),
                    companyIds: (task.associations?.companies?.results || []).map((association) => association.id),
                    dealIds: (task.associations?.deals?.results || []).map((association) => association.id),
                    createdAt: task.createdAt ?? task.properties?.['hs_createdate'] ?? undefined,
                    updatedAt: task.updatedAt ?? task.properties?.['hs_lastmodifieddate'] ?? undefined
                }));

                await nango.batchSave(records, 'Task');

                latestUpdatedAt = records.reduce((latest, record) => updateLatestUpdatedAt(latest, record.updatedAt), latestUpdatedAt);

                const nextAfter = data.paging?.next?.after;

                if (nextAfter) {
                    await nango.saveCheckpoint({
                        phase: 'initial',
                        after: nextAfter,
                        updatedAfter: latestUpdatedAt || ''
                    });
                    after = nextAfter;
                    continue;
                }

                if (latestUpdatedAt) {
                    await nango.saveCheckpoint({
                        phase: 'incremental',
                        after: '',
                        updatedAfter: latestUpdatedAt
                    });
                }

                hasMore = false;
            }

            return;
        }

        const updatedAfter = checkpoint.updatedAfter;
        let after = checkpoint.after;
        let latestUpdatedAt = updatedAfter;
        let hasMore = true;

        while (hasMore) {
            const searchBody: Record<string, unknown> = {
                limit: 100,
                properties: [
                    'hs_task_type',
                    'hs_task_subject',
                    'hs_task_priority',
                    'hs_task_assignee',
                    'hs_task_due_date',
                    'hs_task_notes',
                    'hs_createdate',
                    'hs_lastmodifieddate'
                ],
                sorts: [
                    {
                        propertyName: 'hs_lastmodifieddate',
                        direction: 'ASCENDING'
                    }
                ],
                filterGroups: [
                    {
                        filters: [
                            {
                                propertyName: 'hs_lastmodifieddate',
                                operator: 'GT',
                                value: updatedAfter
                            }
                        ]
                    }
                ],
                ...(after && { after })
            };

            // Incremental syncs use search so they can filter by last modified date.
            // HubSpot search queries are capped at 10,000 total results; paging past that returns a 400 and can leave this incremental sync incomplete.
            // Template users should narrow the search window/filter strategy to fit their data volume before relying on this template.
            // https://developers.hubspot.com/docs/api-reference/search/guide#paging-through-results
            const response = await nango.post({
                endpoint: '/crm/v3/objects/tasks/search',
                data: searchBody,
                retries: 3
            });

            const data = TaskResponseSchema.parse(response.data);
            const tasks = data.results || [];

            if (tasks.length === 0) {
                break;
            }

            const records: Array<z.infer<typeof TaskSchema>> = [];

            for (const task of tasks) {
                let contactIds = (task.associations?.contacts?.results || []).map((association) => association.id);
                let companyIds = (task.associations?.companies?.results || []).map((association) => association.id);
                let dealIds = (task.associations?.deals?.results || []).map((association) => association.id);

                if (contactIds.length === 0) {
                    contactIds = await fetchAssociatedIds(nango, task.id, 'contacts');
                }

                if (companyIds.length === 0) {
                    companyIds = await fetchAssociatedIds(nango, task.id, 'companies');
                }

                if (dealIds.length === 0) {
                    dealIds = await fetchAssociatedIds(nango, task.id, 'deals');
                }

                records.push({
                    id: task.id,
                    type: task.properties?.['hs_task_type'] ?? undefined,
                    title: task.properties?.['hs_task_subject'] ?? undefined,
                    priority: task.properties?.['hs_task_priority'] ?? undefined,
                    assigneeId: task.properties?.['hs_task_assignee'] ?? undefined,
                    dueDate: task.properties?.['hs_task_due_date'] ?? undefined,
                    notes: task.properties?.['hs_task_notes'] ?? undefined,
                    contactIds,
                    companyIds,
                    dealIds,
                    createdAt: task.createdAt ?? task.properties?.['hs_createdate'] ?? undefined,
                    updatedAt: task.updatedAt ?? task.properties?.['hs_lastmodifieddate'] ?? undefined
                });
            }

            await nango.batchSave(records, 'Task');

            latestUpdatedAt = records.reduce((latest, record) => updateLatestUpdatedAt(latest, record.updatedAt), latestUpdatedAt);

            const nextAfter = data.paging?.next?.after;

            if (nextAfter) {
                await nango.saveCheckpoint({
                    phase: 'incremental',
                    after: nextAfter,
                    updatedAfter: updatedAfter || ''
                });
                after = nextAfter;
                continue;
            }

            if (latestUpdatedAt) {
                await nango.saveCheckpoint({
                    phase: 'incremental',
                    after: '',
                    updatedAfter: latestUpdatedAt
                });
            }

            hasMore = false;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
