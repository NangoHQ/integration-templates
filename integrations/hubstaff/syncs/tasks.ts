import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OrganizationSchema = z.object({
    id: z.number(),
    name: z.string().optional()
});

const ProjectSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    status: z.string().optional()
});

const TaskSchema = z.object({
    id: z.number(),
    status: z.string(),
    project_id: z.number(),
    summary: z.string(),
    details: z.string().optional().nullable(),
    assignee_ids: z.array(z.number()),
    lock_version: z.number().optional().nullable(),
    completed_at: z.string().optional().nullable(),
    due_at: z.string().optional().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const TaskModelSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    project_id: z.number().optional(),
    summary: z.string().optional(),
    details: z.string().optional(),
    assignee_ids: z.array(z.number()).optional(),
    lock_version: z.number().optional(),
    completed_at: z.string().optional(),
    due_at: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const sync = createSync({
    description: 'Sync tasks across all projects',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Task: TaskModelSchema
    },

    exec: async (nango) => {
        const orgsProxyConfig: ProxyConfiguration = {
            // https://developer.hubstaff.com/
            endpoint: 'v2/organizations',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'page_start_id',
                cursor_path_in_response: 'pagination.next_page_start_id',
                response_path: 'organizations',
                limit_name_in_request: 'page_limit',
                limit: 100
            },
            retries: 3
        };

        const organizations: z.infer<typeof OrganizationSchema>[] = [];
        for await (const orgsPage of nango.paginate(orgsProxyConfig)) {
            for (const org of orgsPage) {
                const parsed = OrganizationSchema.safeParse(org);
                if (!parsed.success) {
                    throw new Error(`Failed to parse organization: ${parsed.error.message}`);
                }
                organizations.push(parsed.data);
            }
        }

        await nango.trackDeletesStart('Task');

        const allProjects: z.infer<typeof ProjectSchema>[] = [];
        for (const org of organizations) {
            const projectsProxyConfig: ProxyConfiguration = {
                // https://developer.hubstaff.com/
                endpoint: `v2/organizations/${encodeURIComponent(String(org.id))}/projects`,
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'page_start_id',
                    cursor_path_in_response: 'pagination.next_page_start_id',
                    response_path: 'projects',
                    limit_name_in_request: 'page_limit',
                    limit: 100
                },
                retries: 3
            };

            for await (const projectsPage of nango.paginate(projectsProxyConfig)) {
                for (const project of projectsPage) {
                    const parsed = ProjectSchema.safeParse(project);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse project: ${parsed.error.message}`);
                    }
                    allProjects.push(parsed.data);
                }
            }
        }

        const activeTasks: z.infer<typeof TaskModelSchema>[] = [];
        const deletedTasks: { id: string }[] = [];

        for (const project of allProjects) {
            const tasksProxyConfig: ProxyConfiguration = {
                // https://developer.hubstaff.com/
                endpoint: `v2/projects/${encodeURIComponent(String(project.id))}/tasks`,
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'page_start_id',
                    cursor_path_in_response: 'pagination.next_page_start_id',
                    response_path: 'tasks',
                    limit_name_in_request: 'page_limit',
                    limit: 100
                },
                retries: 3
            };

            for await (const tasksPage of nango.paginate(tasksProxyConfig)) {
                for (const task of tasksPage) {
                    const parsed = TaskSchema.safeParse(task);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse task: ${parsed.error.message}`);
                    }

                    const taskRecord = parsed.data;
                    if (taskRecord.status === 'deleted') {
                        deletedTasks.push({ id: String(taskRecord.id) });
                    } else {
                        activeTasks.push({
                            id: String(taskRecord.id),
                            status: taskRecord.status,
                            project_id: taskRecord.project_id,
                            summary: taskRecord.summary,
                            ...(taskRecord.details != null && { details: taskRecord.details }),
                            assignee_ids: taskRecord.assignee_ids,
                            ...(taskRecord.lock_version != null && { lock_version: taskRecord.lock_version }),
                            ...(taskRecord.completed_at != null && { completed_at: taskRecord.completed_at }),
                            ...(taskRecord.due_at != null && { due_at: taskRecord.due_at }),
                            created_at: taskRecord.created_at,
                            updated_at: taskRecord.updated_at
                        });
                    }
                }
            }
        }

        if (activeTasks.length > 0) {
            await nango.batchSave(activeTasks, 'Task');
        }

        if (deletedTasks.length > 0) {
            await nango.batchDelete(deletedTasks, 'Task');
        }

        await nango.trackDeletesEnd('Task');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
