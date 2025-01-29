import { z } from 'zod';

export const metadataSchema = z.object({
    projects: z
        .array(
            z.object({
                projectId: z.number().positive(),
                todoSetId: z.number().positive()
            })
        )
        .nonempty()
});

export const createTodoSchema = z.object({
    projectId: z.number().positive(),
    todoListId: z.number().positive(),
    content: z.string().min(1, 'Task content is required.'),
    description: z.string().optional(),
    due_on: z.string().optional(),
    starts_on: z.string().optional(),
    notify: z.boolean().optional(),
    assigneeEmails: z.array(z.string().email()).optional(),
    completionSubscriberEmails: z.array(z.string().email()).optional()
});
