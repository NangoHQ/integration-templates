import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    title: z.string().describe('Title of the task. Example: "Blog Updates"'),
    description: z.string().optional().describe('Description of the task. Example: "Announcement blog for recent revamp"'),
    priority: z.enum(['high', 'medium', 'low']).optional().describe('Priority of the task. Example: "low"'),
    status: z.enum(['inprogress', 'completed']).optional().describe('Status of the task. Example: "inprogress"'),
    dueDate: z.string().optional().describe('Due date in DD/MM/YYYY format. Example: "23/01/2024"'),
    reminderDate: z.string().optional().describe('Reminder date in ISO 8601 format. Example: "2024-01-23T12:34:56+05:30"'),
    emailReminder: z.boolean().optional().describe('Send reminder via email'),
    popupReminder: z.boolean().optional().describe('Send reminder notification')
});

const ProviderTaskSchema = z
    .object({
        id: z.string(),
        title: z.string(),
        description: z.string().optional().nullable(),
        priority: z.string().optional().nullable(),
        status: z.string().optional().nullable(),
        dueDate: z.string().optional().nullable(),
        createdAt: z.string().optional().nullable(),
        modifiedTime: z.string().optional().nullable(),
        assignee: z
            .object({
                id: z.union([z.string(), z.number()]),
                name: z.string().optional().nullable()
            })
            .optional()
            .nullable(),
        owner: z
            .object({
                id: z.union([z.string(), z.number()]),
                name: z.string().optional().nullable()
            })
            .optional()
            .nullable(),
        project: z
            .object({
                id: z.string().optional().nullable(),
                name: z.string().optional().nullable()
            })
            .optional()
            .nullable()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        status: z.object({
            code: z.number(),
            description: z.string()
        }),
        data: ProviderTaskSchema
    })
    .passthrough();

const ConnectionSchema = z
    .object({
        credentials: z
            .object({
                raw: z.object({ api_domain: z.string().optional() }).passthrough()
            })
            .passthrough()
    })
    .passthrough();

function getMailBaseUrl(apiDomain: string): string {
    if (apiDomain.endsWith('.eu')) {
        return 'https://mail.zoho.eu';
    }
    if (apiDomain.endsWith('.in')) {
        return 'https://mail.zoho.in';
    }
    if (apiDomain.endsWith('.com.au')) {
        return 'https://mail.zoho.com.au';
    }
    return 'https://mail.zoho.com';
}

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    priority: z.string().optional(),
    status: z.string().optional(),
    dueDate: z.string().optional(),
    createdAt: z.string().optional(),
    modifiedTime: z.string().optional(),
    assignee: z
        .object({
            id: z.union([z.string(), z.number()]),
            name: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    owner: z
        .object({
            id: z.union([z.string(), z.number()]),
            name: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    project: z
        .object({
            id: z.string().optional().nullable(),
            name: z.string().optional().nullable()
        })
        .optional()
        .nullable()
});

const action = createAction({
    description: 'Create a personal task in Zoho Mail.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-task',
        group: 'Tasks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.tasks.ALL', 'ZohoMail.tasks.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const parsedConnection = connection ? ConnectionSchema.safeParse(connection) : undefined;
        const rawApiDomain = parsedConnection?.success ? parsedConnection.data.credentials.raw['api_domain'] : undefined;
        const configApiDomain = connection?.connection_config?.['api_domain'];
        const resolvedApiDomain = typeof rawApiDomain === 'string' ? rawApiDomain : typeof configApiDomain === 'string' ? configApiDomain : undefined;
        const apiDomain = resolvedApiDomain ? getMailBaseUrl(resolvedApiDomain) : 'https://mail.zoho.com';

        const response = await nango.post({
            // https://www.zoho.com/mail/help/api/post-add-new-task.html
            endpoint: '/api/tasks/me',
            baseUrlOverride: apiDomain,
            data: {
                title: input.title,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.priority !== undefined && { priority: input.priority }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
                ...(input.reminderDate !== undefined && { reminderDate: input.reminderDate }),
                ...(input.emailReminder !== undefined && { emailReminder: input.emailReminder }),
                ...(input.popupReminder !== undefined && { popupReminder: input.popupReminder })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const task = providerResponse.data;

        return {
            id: task.id,
            title: task.title,
            ...(task.description != null && { description: task.description }),
            ...(task.priority != null && { priority: task.priority }),
            ...(task.status != null && { status: task.status }),
            ...(task.dueDate != null && { dueDate: task.dueDate }),
            ...(task.createdAt != null && { createdAt: task.createdAt }),
            ...(task.modifiedTime != null && { modifiedTime: task.modifiedTime }),
            ...(task.assignee != null && { assignee: task.assignee }),
            ...(task.owner != null && { owner: task.owner }),
            ...(task.project != null && { project: task.project })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
