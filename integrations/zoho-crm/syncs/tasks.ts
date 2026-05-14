import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Provider schema for raw Zoho CRM Task response
// https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
const ProviderTaskSchema = z.object({
    id: z.string(),
    Subject: z.string().optional().nullable(),
    Status: z.string().optional().nullable(),
    Priority: z.string().optional().nullable(),
    Owner: z
        .object({
            name: z.string().optional(),
            id: z.string(),
            email: z.string().optional()
        })
        .optional()
        .nullable(),
    Created_By: z
        .object({
            name: z.string().optional(),
            id: z.string(),
            email: z.string().optional()
        })
        .optional()
        .nullable(),
    Modified_By: z
        .object({
            name: z.string().optional(),
            id: z.string(),
            email: z.string().optional()
        })
        .optional()
        .nullable(),
    Created_Time: z.string().optional().nullable(),
    Modified_Time: z.string().optional().nullable(),
    Due_Date: z.string().optional().nullable(),
    Description: z.string().optional().nullable(),
    Remind_At: z.string().optional().nullable(),
    Closed_Time: z.string().optional().nullable(),
    Send_Notification_Email: z.boolean().optional().nullable(),
    $se_module: z.string().optional().nullable(),
    What_Id: z
        .object({
            name: z.string().optional(),
            id: z.string()
        })
        .optional()
        .nullable(),
    Who_Id: z
        .object({
            name: z.string().optional(),
            id: z.string()
        })
        .optional()
        .nullable()
});

// Normalized Task model for Nango
const TaskSchema = z.object({
    id: z.string(),
    subject: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    owner_id: z.string().optional(),
    owner_name: z.string().optional(),
    created_by_id: z.string().optional(),
    modified_by_id: z.string().optional(),
    created_time: z.string().optional(),
    modified_time: z.string().optional(),
    due_date: z.string().optional(),
    description: z.string().optional(),
    related_module: z.string().optional(),
    related_record_id: z.string().optional()
});

// Checkpoint must be a ZodObject with string/number/boolean values
// Use empty string as default to handle first run (no undefined)
const CheckpointSchema = z.object({
    modified_after: z.string(),
    page: z.number().int().positive()
});

const InfoSchema = z.object({
    per_page: z.number(),
    count: z.number(),
    page: z.number(),
    more_records: z.boolean()
});

const ResponseSchema = z.object({
    data: z.array(ProviderTaskSchema),
    info: InfoSchema
});

const DeletedTaskSchema = z.object({
    id: z.string()
});

const sync = createSync({
    description: 'Sync tasks from Zoho CRM',
    version: '1.0.0',
    frequency: 'every hour',
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/tasks'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        Task: TaskSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const modifiedAfter: string | undefined = checkpoint?.['modified_after'] || undefined;
        const previousModifiedAfter = modifiedAfter;

        let page = checkpoint?.['page'] ?? 1;
        let lastModifiedTime: string | undefined;

        // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
        while (true) {
            const config: {
                endpoint: string;
                params: Record<string, string>;
                headers?: Record<string, string>;
                retries: number;
            } = {
                endpoint: '/crm/v2/Tasks',
                params: {
                    page: String(page),
                    per_page: '200',
                    sort_by: 'Modified_Time',
                    sort_order: 'asc'
                },
                retries: 3
            };

            if (modifiedAfter) {
                config.headers = {
                    'If-Modified-Since': modifiedAfter
                };
            }

            const response = await nango.get(config);
            const parsed = ResponseSchema.safeParse(response.data);

            if (!parsed.success) {
                await nango.log(`Failed to parse response: ${parsed.error.message}`, { level: 'error' });
                throw new Error(`Invalid response from Zoho CRM: ${parsed.error.message}`);
            }

            const { data: tasks, info } = parsed.data;

            if (tasks.length === 0) {
                await nango.saveCheckpoint({
                    modified_after: modifiedAfter ?? '',
                    page: 1
                });
                break;
            }

            const normalizedTasks = tasks.map((task) => ({
                id: task.id,
                ...(task.Subject != null && { subject: task.Subject }),
                ...(task.Status != null && { status: task.Status }),
                ...(task.Priority != null && { priority: task.Priority }),
                ...(task.Owner != null && {
                    owner_id: task.Owner.id,
                    owner_name: task.Owner.name
                }),
                ...(task.Created_By != null && { created_by_id: task.Created_By.id }),
                ...(task.Modified_By != null && { modified_by_id: task.Modified_By.id }),
                ...(task.Created_Time != null && { created_time: task.Created_Time }),
                ...(task.Modified_Time != null && { modified_time: task.Modified_Time }),
                ...(task.Due_Date != null && { due_date: task.Due_Date }),
                ...(task.Description != null && { description: task.Description }),
                ...(task.$se_module != null && { related_module: task.$se_module }),
                ...(task.What_Id != null && { related_record_id: task.What_Id.id })
            }));

            await nango.batchSave(normalizedTasks, 'Task');

            // Track the last modified time for checkpoint
            const lastTask = tasks[tasks.length - 1];
            if (lastTask?.Modified_Time) {
                lastModifiedTime = lastTask.Modified_Time;
            }

            if (info.more_records) {
                page += 1;
                await nango.saveCheckpoint({
                    modified_after: modifiedAfter ?? '',
                    page
                });
                continue;
            }

            await nango.saveCheckpoint({
                modified_after: lastModifiedTime ?? modifiedAfter ?? '',
                page: 1
            });
            break;
        }

        if (previousModifiedAfter) {
            const deletedTasks: Array<{ id: string }> = [];
            const deletedProxyConfig: ProxyConfiguration = {
                // https://www.zoho.com/crm/developer/docs/api/v2/get-deleted-records.html
                endpoint: '/crm/v2/Tasks/deleted',
                headers: {
                    'If-Modified-Since': previousModifiedAfter
                },
                params: {
                    type: 'all'
                },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_start_value: 1,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'per_page',
                    limit: 200,
                    response_path: 'data'
                },
                retries: 3
            };

            for await (const pageResults of nango.paginate<z.infer<typeof DeletedTaskSchema>>(deletedProxyConfig)) {
                for (const rawRecord of pageResults) {
                    const parsedRecord = DeletedTaskSchema.safeParse(rawRecord);
                    if (parsedRecord.success) {
                        deletedTasks.push({ id: parsedRecord.data.id });
                    }
                }
            }

            if (deletedTasks.length > 0) {
                await nango.batchDelete(deletedTasks, 'Task');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
