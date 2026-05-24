import { createSync } from 'nango';
import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';

// Provider docs: https://docs.apollo.io/reference/search-tasks

const _ApolloTaskSchema = z.object({
    id: z.string(),
    type: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    priority: z.string().nullable().optional(),
    due_at: z.string().nullable().optional(),
    completed_at: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    contact_id: z.string().nullable().optional(),
    account_id: z.string().nullable().optional(),
    opportunity_id: z.string().nullable().optional(),
    owner_id: z.string().nullable().optional(),
    creator_id: z.string().nullable().optional(),
    salesforce_id: z.string().nullable().optional(),
    salesforce_account_id: z.string().nullable().optional(),
    salesforce_contact_id: z.string().nullable().optional(),
    salesforce_opportunity_id: z.string().nullable().optional(),
    salesforce_owner_id: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    folder_id: z.string().nullable().optional()
});

const TaskSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    due_at: z.string().optional(),
    completed_at: z.string().optional(),
    note: z.string().optional(),
    title: z.string().optional(),
    contact_id: z.string().optional(),
    account_id: z.string().optional(),
    opportunity_id: z.string().optional(),
    owner_id: z.string().optional(),
    creator_id: z.string().optional(),
    salesforce_id: z.string().optional(),
    salesforce_account_id: z.string().optional(),
    salesforce_contact_id: z.string().optional(),
    salesforce_opportunity_id: z.string().optional(),
    salesforce_owner_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    folder_id: z.string().optional()
});

const sync = createSync({
    description: 'Sync tasks from Apollo.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/tasks' }],
    models: {
        Task: TaskSchema
    },

    exec: async (nango) => {
        // Blocker: Apollo Tasks Search API does not support filtering by updated_at or modified_since.
        // The endpoint only supports sort_by_field (task_due_at, task_priority) and basic pagination.
        // Without a changed-since filter, we must start from page 1 each run before ending deletion tracking.
        await nango.trackDeletesStart('Task');

        const proxyConfig: ProxyConfiguration = {
            // https://docs.apollo.io/reference/search-tasks
            endpoint: '/v1/tasks/search',
            method: 'POST',
            data: {
                per_page: 100
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'tasks'
            },
            retries: 3
        };

        for await (const tasks of nango.paginate<z.infer<typeof _ApolloTaskSchema>>(proxyConfig)) {
            const validTasks = tasks.map((task) => ({
                id: task.id,
                ...(task.type != null && { type: task.type }),
                ...(task.status != null && { status: task.status }),
                ...(task.priority != null && { priority: task.priority }),
                ...(task.due_at != null && { due_at: task.due_at }),
                ...(task.completed_at != null && { completed_at: task.completed_at }),
                ...(task.note != null && { note: task.note }),
                ...(task.title != null && { title: task.title }),
                ...(task.contact_id != null && { contact_id: task.contact_id }),
                ...(task.account_id != null && { account_id: task.account_id }),
                ...(task.opportunity_id != null && { opportunity_id: task.opportunity_id }),
                ...(task.owner_id != null && { owner_id: task.owner_id }),
                ...(task.creator_id != null && { creator_id: task.creator_id }),
                ...(task.salesforce_id != null && { salesforce_id: task.salesforce_id }),
                ...(task.salesforce_account_id != null && {
                    salesforce_account_id: task.salesforce_account_id
                }),
                ...(task.salesforce_contact_id != null && {
                    salesforce_contact_id: task.salesforce_contact_id
                }),
                ...(task.salesforce_opportunity_id != null && {
                    salesforce_opportunity_id: task.salesforce_opportunity_id
                }),
                ...(task.salesforce_owner_id != null && {
                    salesforce_owner_id: task.salesforce_owner_id
                }),
                ...(task.created_at != null && { created_at: task.created_at }),
                ...(task.updated_at != null && { updated_at: task.updated_at }),
                ...(task.folder_id != null && { folder_id: task.folder_id })
            }));

            if (validTasks.length > 0) {
                await nango.batchSave(validTasks, 'Task');
            }
        }

        await nango.trackDeletesEnd('Task');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
