import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderTaskListSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    updated: z.string().optional(),
    selfLink: z.string().optional()
});

const TaskListSchema = z
    .object({
        id: z.string().describe('The unique identifier of the task list.'),
        title: z.string().optional().describe('The title of the task list.'),
        updated: z.string().optional().describe('The last modification time of the task list as an RFC 3339 timestamp.'),
        selfLink: z.string().optional().describe('The URL that points to this task list.')
    })
    .describe('Metadata about a single Google Tasks task list.');

const sync = createSync({
    description: 'Sync metadata (title, updated timestamp) for every task list in the account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        TaskList: TaskListSchema
    },

    exec: async (nango) => {
        // tasklists.list has no changed-since filter, so this is a full refresh on every
        // run; trackDeletes removes lists that disappeared since the previous execution.
        await nango.trackDeletesStart('TaskList');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.google.com/tasks/reference/rest/v1/tasklists/list
            endpoint: '/tasks/v1/users/@me/lists',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'pageToken',
                cursor_path_in_response: 'nextPageToken',
                response_path: 'items',
                limit_name_in_request: 'maxResults',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate<z.infer<typeof ProviderTaskListSchema>>(proxyConfig)) {
            const taskLists = page.map((item) => {
                const taskList = ProviderTaskListSchema.parse(item);
                return {
                    id: taskList.id,
                    ...(taskList.title != null && { title: taskList.title }),
                    ...(taskList.updated != null && { updated: taskList.updated }),
                    ...(taskList.selfLink != null && { selfLink: taskList.selfLink })
                };
            });

            if (taskLists.length > 0) {
                await nango.batchSave(taskLists, 'TaskList');
            }
        }

        await nango.trackDeletesEnd('TaskList');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
