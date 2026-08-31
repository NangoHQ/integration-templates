import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    pending_pairs: z.string().describe('JSON-encoded queue of remaining { projectId, todosetId } pairs to crawl.')
});

const TodoSetRefSchema = z.object({
    projectId: z.number(),
    todosetId: z.number()
});

function parsePendingPairs(json: string): Array<z.infer<typeof TodoSetRefSchema>> {
    return z.array(TodoSetRefSchema).parse(JSON.parse(json));
}

const ProviderDockToolSchema = z.object({
    id: z.number(),
    name: z.string(),
    enabled: z.boolean()
});

const ProviderProjectSchema = z.object({
    id: z.number(),
    name: z.string(),
    dock: z.array(ProviderDockToolSchema)
});

const ProviderBucketSchema = z.object({
    id: z.number(),
    name: z.string()
});

const ProviderParentSchema = z.object({
    id: z.number(),
    title: z.string()
});

const ProviderTodolistSchema = z.object({
    id: z.number(),
    status: z.string(),
    visible_to_clients: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    title: z.string(),
    position: z.number(),
    parent: ProviderParentSchema,
    bucket: ProviderBucketSchema,
    description: z.string().optional(),
    completed: z.boolean(),
    completed_ratio: z.string().optional(),
    color: z.string().nullable().optional(),
    comments_count: z.number().optional(),
    url: z.string().optional(),
    app_url: z.string().optional()
});

const TodolistSchema = z
    .object({
        id: z.string().describe('The unique identifier of the to-do list as a string.'),
        status: z.string().describe('The current status of the to-do list, such as "active" or "trashed".'),
        visible_to_clients: z.boolean().describe('Whether the to-do list is visible to clients on the project.'),
        created_at: z.string().describe('The ISO 8601 timestamp when the to-do list was created.'),
        updated_at: z.string().describe('The ISO 8601 timestamp when the to-do list was last updated.'),
        title: z.string().describe('The title of the to-do list.'),
        position: z.number().describe('The position of the to-do list within its parent to-do set.'),
        project_id: z.string().describe('The identifier of the project that contains this to-do list.'),
        project_name: z.string().describe('The name of the project that contains this to-do list.'),
        todoset_id: z.string().describe('The identifier of the parent to-do set.'),
        description: z.string().optional().describe('The description of the to-do list.'),
        completed: z.boolean().describe('Whether the to-do list is marked as completed.'),
        completed_ratio: z.string().optional().describe('A string representation of the completion ratio, e.g., "2/5".'),
        color: z.string().nullable().optional().describe('The color assigned to the to-do list, if any.'),
        comments_count: z.number().optional().describe('The number of comments on the to-do list.'),
        url: z.string().optional().describe('The API URL for the to-do list.'),
        app_url: z.string().optional().describe('The application URL for the to-do list.')
    })
    .describe('A to-do list in a Basecamp project.');

const sync = createSync({
    description: 'Sync to-do lists across all known projects to-do sets.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Todolist: TodolistSchema
    },

    exec: async (nango) => {
        async function discoverTodosets(): Promise<Array<z.infer<typeof TodoSetRefSchema>>> {
            const projectProxyConfig: ProxyConfiguration = {
                // https://github.com/basecamp/bc3-api/blob/master/sections/projects.md#get-all-projects
                endpoint: '/projects.json',
                paginate: {
                    type: 'link',
                    link_rel_in_response_header: 'next',
                    limit_name_in_request: 'limit',
                    limit: 100
                },
                retries: 3
            };

            const projects: z.infer<typeof ProviderProjectSchema>[] = [];
            for await (const page of nango.paginate(projectProxyConfig)) {
                for (const raw of page) {
                    const parsed = ProviderProjectSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse project: ${parsed.error.message}`);
                    }
                    projects.push(parsed.data);
                }
            }

            const todosets: Array<z.infer<typeof TodoSetRefSchema>> = [];
            for (const project of projects) {
                const todoset = project.dock.find((tool) => tool.name === 'todoset');
                if (todoset && todoset.enabled) {
                    todosets.push({ projectId: project.id, todosetId: todoset.id });
                }
            }

            return todosets;
        }

        const checkpoint = await nango.getCheckpoint();
        let queue: Array<z.infer<typeof TodoSetRefSchema>>;

        if (checkpoint != null && typeof checkpoint['pending_pairs'] === 'string') {
            queue = parsePendingPairs(checkpoint['pending_pairs']);
            // A checkpoint restored with an empty queue is indistinguishable from a prior
            // execution that crashed right after persisting its final (empty) checkpoint but
            // before trackDeletesEnd ran. Treat it as untrustworthy and rediscover from scratch
            // rather than let an empty queue silently close out delete tracking below.
            if (queue.length === 0) {
                queue = await discoverTodosets();
            }
        } else {
            queue = await discoverTodosets();
        }

        // If there is still nothing to crawl (no projects with an enabled to-do set), skip
        // delete tracking entirely instead of opening and immediately closing an empty window,
        // which would delete every previously synced Todolist.
        if (queue.length === 0) {
            await nango.clearCheckpoint();
            return;
        }

        // Safe to call on every execution; trackDeletesStart will not overwrite the
        // start of a delete-tracking window that a prior execution already opened.
        await nango.trackDeletesStart('Todolist');

        while (queue.length > 0) {
            const pair = queue.shift();
            if (!pair) {
                continue;
            }

            // https://github.com/basecamp/bc3-api/blob/master/sections/todolists.md#get-to-do-lists
            const todolistsProxyConfig: ProxyConfiguration = {
                // https://github.com/basecamp/bc3-api/blob/master/sections/todolists.md#get-to-do-lists
                endpoint: `/buckets/${encodeURIComponent(pair.projectId)}/todosets/${encodeURIComponent(pair.todosetId)}/todolists.json`,
                paginate: {
                    type: 'link',
                    link_rel_in_response_header: 'next',
                    limit_name_in_request: 'limit',
                    limit: 100
                },
                retries: 3
            };

            for await (const page of nango.paginate(todolistsProxyConfig)) {
                const todolists: z.infer<typeof TodolistSchema>[] = [];
                for (const raw of page) {
                    const parsed = ProviderTodolistSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse todolist: ${parsed.error.message}`);
                    }
                    const t = parsed.data;
                    todolists.push({
                        id: String(t.id),
                        status: t.status,
                        visible_to_clients: t.visible_to_clients,
                        created_at: t.created_at,
                        updated_at: t.updated_at,
                        title: t.title,
                        position: t.position,
                        project_id: String(t.bucket.id),
                        project_name: t.bucket.name,
                        todoset_id: String(t.parent.id),
                        description: t.description,
                        completed: t.completed,
                        completed_ratio: t.completed_ratio,
                        color: t.color,
                        comments_count: t.comments_count,
                        url: t.url,
                        app_url: t.app_url
                    });
                }

                if (todolists.length > 0) {
                    await nango.batchSave(todolists, 'Todolist');
                }
            }

            if (queue.length > 0) {
                await nango.saveCheckpoint({ pending_pairs: JSON.stringify(queue) });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Todolist');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
