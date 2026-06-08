import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TaskSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    project_id: z.number().optional(),
    project_name: z.string().optional(),
    stage_id: z.number().optional(),
    stage_name: z.string().optional(),
    write_date: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const Many2oneSchema = z.union([z.tuple([z.number(), z.string()]), z.boolean(), z.null()]).optional();

const OdooTaskSchema = z.object({
    id: z.number(),
    name: z.string().optional().nullable(),
    project_id: Many2oneSchema,
    stage_id: Many2oneSchema,
    write_date: z.string()
});

const sync = createSync({
    description: 'Sync Odoo project tasks',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Task: TaskSchema
    },
    endpoints: [
        {
            path: '/syncs/project-tasks',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint || { updated_after: '' });
        if (!parsedCheckpoint.success) {
            throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
        }

        const updatedAfter = parsedCheckpoint.data.updated_after || undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://www.odoo.com/documentation/master/developer/reference/external_api.html
            endpoint: '/1.0/project.task',
            params: {
                fields: "['id','name','project_id','stage_id','write_date']",
                order: 'write_date asc, id asc',
                ...(updatedAfter && { write_date: updatedAfter })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'records'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const rawTasks = z.array(OdooTaskSchema).safeParse(page);
            if (!rawTasks.success) {
                throw new Error(`Failed to parse Odoo tasks: ${rawTasks.error.message}`);
            }

            const tasks = rawTasks.data.map((task) => {
                const projectId = Array.isArray(task.project_id) ? task.project_id[0] : undefined;
                const projectName = Array.isArray(task.project_id) ? task.project_id[1] : undefined;
                const stageId = Array.isArray(task.stage_id) ? task.stage_id[0] : undefined;
                const stageName = Array.isArray(task.stage_id) ? task.stage_id[1] : undefined;

                return {
                    id: String(task.id),
                    ...(task.name != null && { name: task.name }),
                    ...(projectId !== undefined && { project_id: projectId }),
                    ...(projectName !== undefined && { project_name: projectName }),
                    ...(stageId !== undefined && { stage_id: stageId }),
                    ...(stageName !== undefined && { stage_name: stageName }),
                    write_date: task.write_date
                };
            });

            if (tasks.length === 0) {
                continue;
            }

            await nango.batchSave(tasks, 'Task');

            const lastTask = tasks[tasks.length - 1];
            if (lastTask?.write_date) {
                await nango.saveCheckpoint({ updated_after: lastTask.write_date });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
