import { createSync } from 'nango';
import { z } from 'zod';

const RawTaskSchema = z.object({
    id: z.string(),
    _type: z.string().optional(),
    lead_id: z.string().optional(),
    assigned_to: z.string().optional(),
    is_complete: z.boolean().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    due_date: z.string().optional(),
    text: z.string().optional(),
    view: z.string().optional(),
    date_updated: z.string().optional()
});

const TaskSchema = z.object({
    id: z.string(),
    _type: z.string().optional(),
    lead_id: z.string().optional(),
    assigned_to: z.string().optional(),
    is_complete: z.boolean().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    due_date: z.string().optional(),
    text: z.string().optional(),
    view: z.enum(['inbox', 'future', 'overdue', 'complete']).optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Incrementally sync Close tasks using date_updated checkpoints.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Task: TaskSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const isFirstRun = checkpoint === null || checkpoint === undefined;

        if (isFirstRun) {
            await nango.trackDeletesStart('Task');
        }

        const params: Record<string, string> = {};
        if (checkpoint !== null && checkpoint !== undefined) {
            params['date_updated__gt'] = checkpoint['updated_after'];
        }

        // https://developer.close.com/
        let maxDateUpdated: string | undefined;

        for await (const page of nango.paginate({
            endpoint: '/v1/task/',
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: '_skip',
                offset_calculation_method: 'per-page',
                limit_name_in_request: '_limit',
                limit: 200,
                response_path: 'data'
            },
            retries: 3
        })) {
            const tasks: Array<{
                id: string;
                _type?: string;
                lead_id?: string;
                assigned_to?: string;
                is_complete?: boolean;
                priority?: 'low' | 'medium' | 'high';
                due_date?: string;
                text?: string;
                view?: 'inbox' | 'future' | 'overdue' | 'complete';
            }> = [];
            const rawItems = z.array(z.unknown()).parse(page);

            for (const rawItem of rawItems) {
                const parsed = RawTaskSchema.parse(rawItem);

                const task: {
                    id: string;
                    _type?: string;
                    lead_id?: string;
                    assigned_to?: string;
                    is_complete?: boolean;
                    priority?: 'low' | 'medium' | 'high';
                    due_date?: string;
                    text?: string;
                    view?: 'inbox' | 'future' | 'overdue' | 'complete';
                } = {
                    id: parsed.id
                };

                if (parsed._type !== undefined) {
                    task['_type'] = parsed._type;
                }
                if (parsed.lead_id !== undefined) {
                    task['lead_id'] = parsed.lead_id;
                }
                if (parsed.assigned_to !== undefined) {
                    task['assigned_to'] = parsed.assigned_to;
                }
                if (parsed.is_complete !== undefined) {
                    task['is_complete'] = parsed.is_complete;
                }
                if (parsed.priority !== undefined) {
                    task['priority'] = parsed.priority;
                }
                if (parsed.due_date !== undefined) {
                    task['due_date'] = parsed.due_date;
                }
                if (parsed.text !== undefined) {
                    task['text'] = parsed.text;
                }
                if (parsed.view !== undefined) {
                    const normalizedView = parsed.view === 'archive' ? 'complete' : parsed.view;
                    if (normalizedView === 'inbox' || normalizedView === 'future' || normalizedView === 'overdue' || normalizedView === 'complete') {
                        task['view'] = normalizedView;
                    } else {
                        throw new Error(`Invalid view value: ${parsed.view}`);
                    }
                }

                tasks.push(task);

                if (parsed.date_updated !== undefined && (maxDateUpdated === undefined || parsed.date_updated > maxDateUpdated)) {
                    maxDateUpdated = parsed.date_updated;
                }
            }

            if (tasks.length > 0) {
                await nango.batchSave(tasks, 'Task');
            }
        }

        if (maxDateUpdated !== undefined) {
            await nango.saveCheckpoint({
                updated_after: maxDateUpdated
            });
        }

        if (isFirstRun) {
            await nango.trackDeletesEnd('Task');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
