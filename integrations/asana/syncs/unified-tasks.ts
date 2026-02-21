import { createSync } from 'nango';
import { toStandardTask } from '../mappers/to-standard-task.js';
import type { BaseAsanaModel, AsanaTask } from '../models.js';
import { StandardTask } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches tasks from Asana and maps them to the standard task model',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/tasks/unified',
            group: 'Unified Task API'
        }
    ],

    models: {
        StandardTask: StandardTask
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const lastSyncDate = nango.lastSyncDate;

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
                            limit: '100',
                            opt_fields: [
                                'name',
                                'resource_type',
                                'completed',
                                'completed_at',
                                'due_on',
                                'start_on',
                                'permalink_url',
                                'notes',
                                'created_at',
                                'modified_at',
                                'assignee.gid',
                                'assignee.name',
                                'assignee.email',
                                'assignee.photo',
                                'assignee_status',
                                'tags.name',
                                'num_likes',
                                'workspace.gid'
                            ].join(',')
                        };

                        if (lastSyncDate) {
                            params['modified_since'] = lastSyncDate.toISOString();
                        }

                        for await (const tasks of nango.paginate<AsanaTask>({ endpoint: '/api/1.0/tasks', params, retries: 10 })) {
                            const mappedTasks = tasks.map((task) => toStandardTask(task, project.gid));
                            await nango.batchSave(mappedTasks, 'StandardTask');
                        }
                    }
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
