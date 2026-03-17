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

const CheckpointSchema = z.object({
    updatedAfter: z.string()
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
            contacts: z.object({ results: z.array(z.object({ id: z.string() })).optional() }).optional(),
            companies: z.object({ results: z.array(z.object({ id: z.string() })).optional() }).optional(),
            deals: z.object({ results: z.array(z.object({ id: z.string() })).optional() }).optional()
        })
        .partial()
        .optional(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish()
});

const TaskSearchResponseSchema = z.object({
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

const AssociationResponseSchema = z.object({
    results: z.array(z.object({ id: z.string() })).optional()
});

function parseOptional<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
    const result = schema.safeParse(value);
    return result.success ? result.data : undefined;
}

const sync = createSync({
    description: 'Sync tasks with type, title, priority, assignee, due date, notes, and related contacts, companies, and deals',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/sync-tasks', group: 'Tasks' }],
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,

    models: {
        Task: TaskSchema
    },

    exec: async (nango) => {
        const checkpoint = parseOptional(CheckpointSchema, await nango.getCheckpoint());

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
            ]
        };

        if (checkpoint?.updatedAfter) {
            searchBody['filterGroups'] = [
                {
                    filters: [
                        {
                            propertyName: 'hs_lastmodifieddate',
                            operator: 'GT',
                            value: checkpoint.updatedAfter
                        }
                    ]
                }
            ];
        }

        let after: string | undefined;

        do {
            if (after) {
                searchBody['after'] = after;
            } else {
                delete searchBody['after'];
            }

            // https://developers.hubspot.com/docs/api-reference/search/guide#paging-through-results
            const response = await nango.post({
                endpoint: '/crm/v3/objects/tasks/search',
                data: searchBody,
                retries: 3
            });

            const data = TaskSearchResponseSchema.parse(response.data);
            const tasks = data.results || [];

            if (tasks.length === 0) {
                break;
            }

            const records: Array<z.infer<typeof TaskSchema>> = [];

            for (const task of tasks) {
                const properties = task.properties || {};

                // Extract association IDs
                const contactIds: string[] = [];
                const companyIds: string[] = [];
                const dealIds: string[] = [];

                if (task.associations) {
                    if (task.associations.contacts?.results) {
                        contactIds.push(...task.associations.contacts.results.map((association) => association.id));
                    }
                    if (task.associations.companies?.results) {
                        companyIds.push(...task.associations.companies.results.map((association) => association.id));
                    }
                    if (task.associations.deals?.results) {
                        dealIds.push(...task.associations.deals.results.map((association) => association.id));
                    }
                } else {
                    // https://developers.hubspot.com/docs/reference/api/crm/associations/associations
                    try {
                        const contactsResponse = await nango.get({
                            endpoint: `/crm/v3/objects/tasks/${task.id}/associations/contacts`,
                            retries: 3
                        });
                        contactIds.push(...(AssociationResponseSchema.parse(contactsResponse.data).results || []).map((association) => association.id));
                    } catch (error) {
                        // Associations may not exist, continue without them
                    }

                    try {
                        const companiesResponse = await nango.get({
                            endpoint: `/crm/v3/objects/tasks/${task.id}/associations/companies`,
                            retries: 3
                        });
                        companyIds.push(...(AssociationResponseSchema.parse(companiesResponse.data).results || []).map((association) => association.id));
                    } catch (error) {
                        // Associations may not exist, continue without them
                    }

                    try {
                        const dealsResponse = await nango.get({
                            endpoint: `/crm/v3/objects/tasks/${task.id}/associations/deals`,
                            retries: 3
                        });
                        dealIds.push(...(AssociationResponseSchema.parse(dealsResponse.data).results || []).map((association) => association.id));
                    } catch (error) {
                        // Associations may not exist, continue without them
                    }
                }

                records.push({
                    id: task.id,
                    type: properties['hs_task_type'] ?? undefined,
                    title: properties['hs_task_subject'] ?? undefined,
                    priority: properties['hs_task_priority'] ?? undefined,
                    assigneeId: properties['hs_task_assignee'] ?? undefined,
                    dueDate: properties['hs_task_due_date'] ?? undefined,
                    notes: properties['hs_task_notes'] ?? undefined,
                    contactIds: contactIds,
                    companyIds: companyIds,
                    dealIds: dealIds,
                    createdAt: task.createdAt ?? properties['hs_createdate'] ?? undefined,
                    updatedAt: task.updatedAt ?? properties['hs_lastmodifieddate'] ?? undefined
                });
            }

            if (records.length === 0) {
                continue;
            }

            await nango.batchSave(records, 'Task');

            // Save checkpoint with the most recent updated_at
            const lastUpdated = records
                .filter((r: any) => r.updatedAt)
                .map((r: any) => r.updatedAt)
                .sort()
                .pop();

            if (lastUpdated) {
                await nango.saveCheckpoint({
                    updatedAfter: lastUpdated
                });
            }

            after = data.paging?.next?.after;
        } while (after);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
