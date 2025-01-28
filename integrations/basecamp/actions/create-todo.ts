import type { NangoAction, ProxyConfiguration } from '../../models';
import { z } from 'zod';

/**
 * Zod schema describing the input the user passes to create a to-do.
 */
const createTodoSchema = z.object({
    projectId: z.number().positive(),
    todoListId: z.number().positive(),
    content: z.string().min(1, 'content is required'),
    description: z.string().optional(),
    due_on: z.string().optional()
});

/**
 * Action: create-todo
 *
 * Calls POST /buckets/{projectId}/todolists/{todoListId}/todos.json
 */
export default async function runAction(nango: NangoAction, input: unknown) {
    // 1) Validate input
    const result = createTodoSchema.safeParse(input);
    if (!result.success) {
        const message = result.error.errors.map((err) => `${err.message} at path ${err.path.join('.')}`).join('; ');
        throw new nango.ActionError({ message: `Invalid create-todo input: ${message}` });
    }
    const { projectId, todoListId, content, description, due_on } = result.data;

    // 2) Prepare the request
    const bodyToSend: Record<string, unknown> = {
        content
    };
    if (description) {
        bodyToSend['description'] = description;
    }
    if (due_on) {
        bodyToSend['due_on'] = due_on;
    }

    const config: ProxyConfiguration = {
        //https://github.com/basecamp/bc3-api/blob/master/sections/todos.md#create-a-to-do
        endpoint: `/buckets/${projectId}/todolists/${todoListId}/todos.json`,
        baseUrlOverride: 'https://3.basecampapi.com/YOUR_ACCOUNT_ID',
        method: 'POST',
        data: bodyToSend,
        retries: 5
    };

    const response = await nango.post<{ data: unknown }>(config);

    return {
        todo: response.data
    };
}
