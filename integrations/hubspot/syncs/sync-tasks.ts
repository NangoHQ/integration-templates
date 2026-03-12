import { createSync } from 'nango';
import { z } from 'zod';

const TaskSchema = z.object({
    id: z.string(),
    type: z.union([z.string(), z.null()]),
    title: z.union([z.string(), z.null()]),
    priority: z.union([z.string(), z.null()]),
    assignee_id: z.union([z.string(), z.null()]),
    due_date: z.union([z.string(), z.null()]),
    notes: z.union([z.string(), z.null()]),
    contact_ids: z.array(z.string()),
    company_ids: z.array(z.string()),
    deal_ids: z.array(z.string()),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
});

const CheckpointSchema = z.object({
    after: z.string()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

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
        const checkpoint = (await nango.getCheckpoint()) as Checkpoint | null;
        let after = checkpoint?.after || undefined;

        while (true) {
            const response = await nango.get<{
                results?: any[];
                paging?: { next?: { after?: string } };
            }>({
                // https://developers.hubspot.com/docs/api-reference/crm-api/objects/tasks
                endpoint: '/crm/v3/objects/tasks',
                params: {
                    properties:
                        'hs_task_type,hs_task_subject,hs_task_priority,hs_task_assignee,hs_task_due_date,hs_task_notes,hs_created_at,hs_lastmodifieddate',
                    associations: 'contacts,companies,deals',
                    limit: '100',
                    ...(after && { after })
                },
                retries: 3
            });

            const records = (response.data.results ?? []).map((task) => {
                const properties = task.properties || {};

                // Extract association IDs
                const contactIds: string[] = [];
                const companyIds: string[] = [];
                const dealIds: string[] = [];

                if (task.associations) {
                    if (task.associations.contacts?.results) {
                        contactIds.push(...task.associations.contacts.results.map((a: any) => a.id));
                    }
                    if (task.associations.companies?.results) {
                        companyIds.push(...task.associations.companies.results.map((a: any) => a.id));
                    }
                    if (task.associations.deals?.results) {
                        dealIds.push(...task.associations.deals.results.map((a: any) => a.id));
                    }
                }

                return {
                    id: task.id,
                    type: properties['hs_task_type'] ?? null,
                    title: properties['hs_task_subject'] ?? null,
                    priority: properties['hs_task_priority'] ?? null,
                    assignee_id: properties['hs_task_assignee'] ?? null,
                    due_date: properties['hs_task_due_date'] ?? null,
                    notes: properties['hs_task_notes'] ?? null,
                    contact_ids: contactIds,
                    company_ids: companyIds,
                    deal_ids: dealIds,
                    created_at: properties['hs_created_at'] ?? null,
                    updated_at: properties['hs_lastmodifieddate'] ?? null
                };
            });

            if (records.length === 0) {
                break;
            }

            await nango.batchSave(records, 'Task');

            const nextAfter = response.data.paging?.next?.after;
            if (nextAfter) {
                after = nextAfter;
                await nango.saveCheckpoint({
                    after
                });
                continue;
            }

            break;
        }

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
