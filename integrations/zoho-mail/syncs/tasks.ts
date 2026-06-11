import { createSync } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    from: z.string()
});

const ProviderOwnerSchema = z
    .object({
        id: z.number(),
        name: z.string()
    })
    .optional();

const ProviderProjectSchema = z
    .object({
        id: z.string(),
        name: z.string()
    })
    .optional();

const ProviderAssigneeSchema = z
    .object({
        id: z.number(),
        name: z.string()
    })
    .optional();

const ProviderTaskSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    dueDate: z.string().optional(),
    createdAt: z.string().optional(),
    modifiedTime: z.string().optional(),
    namespaceId: z.string().optional(),
    project: ProviderProjectSchema,
    assignee: ProviderAssigneeSchema,
    owner: ProviderOwnerSchema
});

const TasksResponseSchema = z.object({
    status: z
        .object({
            code: z.number(),
            description: z.string().optional()
        })
        .optional(),
    data: z.object({
        paging: z
            .object({
                nextPage: z.string().optional()
            })
            .optional(),
        tasks: z.array(z.unknown())
    })
});

const TaskSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    dueDate: z.string().optional(),
    createdAt: z.string().optional(),
    modifiedTime: z.string().optional(),
    namespaceId: z.string().optional(),
    projectId: z.string().optional(),
    projectName: z.string().optional(),
    assigneeId: z.number().optional(),
    assigneeName: z.string().optional(),
    ownerId: z.number().optional(),
    ownerName: z.string().optional()
});

function getNextPageCursor(nextPage: string | undefined): string | undefined {
    if (!nextPage) {
        return undefined;
    }

    return new URL(nextPage, 'https://mail.zoho.com').searchParams.get('from') ?? undefined;
}

const sync = createSync({
    description: 'Sync personal tasks from Zoho Mail.',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Task: TaskSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/tasks'
        }
    ],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = rawCheckpoint ? CheckpointSchema.safeParse(rawCheckpoint) : null;

        // Blocker: provider only exposes /api/tasks/me with no changed-since filter
        // or deleted-record endpoint. It does expose pagination, so we use the
        // `from` cursor only to resume interrupted full refreshes safely.
        await nango.trackDeletesStart('Task');
        let from = parsedCheckpoint?.success ? parsedCheckpoint.data.from : undefined;
        const hadExistingCheckpoint = !!from;
        let checkpointSaved = false;

        do {
            const response = await nango.get({
                // https://www.zoho.com/mail/help/api/get-all-group-or-personal-tasks.html
                endpoint: '/api/tasks/me',
                params: {
                    limit: 200,
                    ...(from && { from })
                },
                retries: 3
            });

            const parsedResponse = TasksResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error(`Invalid tasks response from provider: ${parsedResponse.error.message}`);
            }

            const tasks: Array<z.infer<typeof TaskSchema>> = [];

            for (const item of parsedResponse.data.data.tasks) {
                const parsed = ProviderTaskSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Invalid task from provider: ${parsed.error.message}`);
                }

                const task = parsed.data;
                tasks.push({
                    id: task.id,
                    title: task.title,
                    ...(task.description != null && task.description !== '' && { description: task.description }),
                    ...(task.status != null && { status: task.status }),
                    ...(task.priority != null && { priority: task.priority }),
                    ...(task.dueDate != null && { dueDate: task.dueDate }),
                    ...(task.createdAt != null && { createdAt: task.createdAt }),
                    ...(task.modifiedTime != null && { modifiedTime: task.modifiedTime }),
                    ...(task.namespaceId != null && { namespaceId: task.namespaceId }),
                    ...(task.project != null && { projectId: task.project.id, projectName: task.project.name }),
                    ...(task.assignee != null && { assigneeId: task.assignee.id, assigneeName: task.assignee.name }),
                    ...(task.owner != null && { ownerId: task.owner.id, ownerName: task.owner.name })
                });
            }

            if (tasks.length > 0) {
                await nango.batchSave(tasks, 'Task');
            }

            const nextFrom = getNextPageCursor(parsedResponse.data.data.paging?.nextPage);
            if (nextFrom) {
                await nango.saveCheckpoint({ from: nextFrom });
                checkpointSaved = true;
            }

            from = nextFrom;
        } while (from);

        if (checkpointSaved || hadExistingCheckpoint) {
            await nango.clearCheckpoint();
        }

        await nango.trackDeletesEnd('Task');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
