import { createSync } from 'nango';
import { toUser } from '../mappers/to-user.js';
import { toTask } from '../mappers/to-task.js';

import type { BaseAsanaModel, AsanaTask } from '../models.js';
import { Task } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Retrieve all tasks that exist in the workspace',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/tasks',
            group: 'Tasks'
        }
    ],

    models: {
        Task: Task
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint<{ modifiedSince: string }>();

        for await (const workspaces of nango.paginate<BaseAsanaModel>({ endpoint: '/api/1.0/workspaces', params: { limit: 100 }, retries: 10 })) {
            for (const workspace of workspaces) {
                for await (const projects of nango.paginate<BaseAsanaModel>({
                    endpoint: '/api/1.0/projects',
                    params: { workspace: workspace.gid, limit: 100 },
                    retries: 10
                })) {
                    for (const project of projects) {
                        const params: Record<string, string> = {
                            project: project.gid,
                            ...(checkpoint.modifiedSince ? { modified_since: checkpoint.modifiedSince} : {}),
                            limit: '100',
                            opt_fields: [
                                'name',
                                'resource_type',
                                'completed',
                                'due_on',
                                'permalink_url',
                                'name',
                                'notes',
                                'created_at',
                                'modified_at',
                                'assignee.name',
                                'assignee.email',
                                'assignee.photo'
                            ].join(',')
                        };

                        for await (const tasks of nango.paginate<AsanaTask>({ endpoint: '/api/1.0/tasks', params, retries: 10 })) {
                            const normalizedTasks = tasks.map((task) => {
                                return {
                                    ...toTask(task),
                                    assignee: task.assignee ? toUser(task.assignee) : null
                                };
                            });
                            await nango.batchSave(normalizedTasks, 'Task');
                            await nango.setCheckpoint({ modifiedSince: tasks.last().modified_at });
                        }
                    }
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
