import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    taskId: z.string().describe('The unique identifier of the task to update. Example: "1781108259800155000"'),
    title: z.string().optional().describe('New title for the task.'),
    description: z.string().optional().describe('New description for the task.'),
    status: z.enum(['inprogress', 'completed']).optional().describe('New status for the task.'),
    dueDate: z.string().optional().describe('New due date for the task. Format: DD/MM/YYYY.'),
    priority: z.enum(['high', 'medium', 'low']).optional().describe('New priority for the task.'),
    reminderDate: z.string().optional().describe('Reminder date and time in ISO 8601 format.'),
    emailReminder: z.boolean().optional().describe('Whether to enable email reminder.'),
    popupReminder: z.boolean().optional().describe('Whether to enable popup reminder.')
});

const StatusSchema = z.object({
    code: z.number(),
    description: z.string()
});

const OutputSchema = z.object({
    taskId: z.string(),
    success: z.boolean(),
    data: z.object({}).passthrough().optional()
});

function extractBaseUrlFromApiDomain(apiDomain: string): string | null {
    if (typeof apiDomain !== 'string') {
        return null;
    }
    const match = apiDomain.match(/https?:\/\/[^/]+\.zohoapis\.([a-z.]+)/);
    if (!match) {
        return null;
    }
    const extension = match[1];
    return `https://mail.zoho.${extension}`;
}

const action = createAction({
    description: 'Update a personal task in Zoho Mail.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.tasks.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const credentials = connection.credentials;
        const rawApiDomain =
            credentials && 'raw' in credentials && typeof credentials['raw'] === 'object' && credentials['raw'] !== null && 'api_domain' in credentials['raw']
                ? credentials['raw']['api_domain']
                : undefined;
        const configApiDomain = connection.connection_config ? connection.connection_config['api_domain'] : undefined;
        const apiDomain = typeof rawApiDomain === 'string' ? rawApiDomain : typeof configApiDomain === 'string' ? configApiDomain : undefined;

        const baseUrl = typeof apiDomain === 'string' ? extractBaseUrlFromApiDomain(apiDomain) : null;

        if (typeof apiDomain === 'string' && !baseUrl) {
            throw new nango.ActionError({
                type: 'invalid_api_domain',
                message: `Could not resolve base URL from api_domain: ${apiDomain}`
            });
        }

        const data: Record<string, string | boolean | undefined> = {};
        if (input.title !== undefined) {
            data['title'] = input.title;
        }
        if (input.description !== undefined) {
            data['description'] = input.description;
        }
        if (input.status !== undefined) {
            data['status'] = input.status;
        }
        if (input.dueDate !== undefined) {
            data['dueDate'] = input.dueDate;
        }
        if (input.priority !== undefined) {
            data['priority'] = input.priority;
        }
        if (input.reminderDate !== undefined) {
            data['reminderDate'] = input.reminderDate;
        }
        if (input.emailReminder !== undefined) {
            data['emailReminder'] = input.emailReminder;
        }
        if (input.popupReminder !== undefined) {
            data['popupReminder'] = input.popupReminder;
        }

        // https://www.zoho.com/mail/help/api/put-change-task-title.html
        const response = await nango.put({
            ...(baseUrl && { baseUrlOverride: baseUrl }),
            endpoint: `/api/tasks/me/${encodeURIComponent(input.taskId)}`,
            data: data,
            retries: 3
        });

        if (response.status >= 400) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Zoho Mail API returned an error.',
                status: response.status,
                response: response.data
            });
        }

        const responseData = response.data;
        const parsedStatus = StatusSchema.safeParse(responseData?.status);
        const success = parsedStatus.success && parsedStatus.data.code === 200;

        return {
            taskId: input.taskId,
            success: success,
            ...(responseData?.data !== undefined && { data: responseData.data })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
