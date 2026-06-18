import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    limit: z.number().min(1).max(499).optional().describe('Number of tasks to retrieve. Default: 20, Max: 499.'),
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.')
});

const TaskSchema = z
    .object({
        id: z.string(),
        title: z.string(),
        description: z.string().optional(),
        priority: z.string().optional(),
        status: z.string().optional(),
        dueDate: z.string().optional(),
        createdAt: z.string().optional(),
        modifiedTime: z.string().optional(),
        owner: z
            .object({
                name: z.string().optional(),
                id: z.union([z.string(), z.number()]).optional()
            })
            .optional(),
        assignee: z
            .object({
                name: z.string().optional(),
                id: z.union([z.string(), z.number()]).optional()
            })
            .optional()
            .nullable(),
        project: z
            .object({
                name: z.string().optional(),
                id: z.string().optional()
            })
            .optional(),
        numberOfSubtasks: z.number().optional(),
        namespaceId: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(TaskSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List all personal tasks in Zoho Mail.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.tasks.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.cursor !== undefined) {
            params['from'] = input.cursor;
        }

        const response = await nango.get({
            // https://www.zoho.com/mail/help/api/get-all-group-or-personal-tasks.html
            endpoint: '/api/tasks/me',
            params,
            retries: 3
        });

        const responseSchema = z.object({
            status: z.object({
                code: z.number(),
                description: z.string()
            }),
            data: z.object({
                paging: z
                    .object({
                        nextPage: z.string().optional()
                    })
                    .optional(),
                tasks: z.array(z.unknown())
            })
        });

        const parsed = responseSchema.parse(response.data);

        const tasks = parsed.data.tasks.map((task) => TaskSchema.parse(task));

        let next_cursor: string | undefined;
        if (parsed.data.paging?.nextPage) {
            const url = new URL(parsed.data.paging.nextPage, 'https://mail.zoho.com');
            const fromValue = url.searchParams.get('from');
            if (fromValue) {
                next_cursor = fromValue;
            }
        }

        return {
            items: tasks,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
