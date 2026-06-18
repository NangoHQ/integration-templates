import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Example: "2"'),
    per_page: z.number().int().min(1).max(200).optional().describe('Number of records per page. Default: 200. Max: 200.'),
    sort_by: z.string().optional().describe('Field API name to sort by. Example: "Due_Date"'),
    sort_order: z.enum(['asc', 'desc']).optional().describe('Sort order. Possible values: asc, desc. Default: desc.'),
    status: z.enum(['Not Started', 'Deferred', 'In Progress', 'Completed', 'Waiting on someone else']).optional().describe('Filter by task status.')
});

const OwnerSchema = z.object({
    name: z.string().optional(),
    id: z.string(),
    email: z.string().optional()
});

const LookupSchema = z.object({
    name: z.string().optional(),
    id: z.string()
});

const TaskSchema = z.object({
    id: z.string(),
    Subject: z.string(),
    Status: z.string().optional(),
    Priority: z.string().optional(),
    Due_Date: z.string().nullable().optional(),
    Description: z.string().nullable().optional(),
    Owner: OwnerSchema.nullable().optional(),
    Who_Id: LookupSchema.nullable().optional(),
    What_Id: LookupSchema.nullable().optional(),
    Created_Time: z.string().optional(),
    Modified_Time: z.string().optional(),
    Created_By: OwnerSchema.nullable().optional(),
    Modified_By: OwnerSchema.nullable().optional(),
    Closed_Time: z.string().nullable().optional(),
    Remind_At: z.unknown().nullable().optional(),
    Recurring_Activity: z.unknown().nullable().optional(),
    Send_Notification_Email: z.boolean().nullable().optional(),
    Tag: z
        .array(z.object({ name: z.string(), id: z.string() }))
        .nullable()
        .optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(TaskSchema),
    info: z.object({
        per_page: z.number(),
        count: z.number(),
        page: z.number(),
        more_records: z.boolean()
    })
});

const OutputSchema = z.object({
    items: z.array(TaskSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List tasks from Zoho CRM',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.tasks.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Invalid cursor. Cursor must be a positive integer representing the page number.'
            });
        }

        const params: Record<string, string | number> = {
            page: page,
            per_page: input.per_page ?? 200
        };

        if (input.sort_by) {
            params['sort_by'] = input.sort_by;
        }

        if (input.sort_order) {
            params['sort_order'] = input.sort_order;
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
        const response = await nango.get({
            endpoint: '/crm/v2/Tasks',
            params: params,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'No data returned from Zoho CRM API'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        // Filter by status if specified
        let tasks = providerResponse.data;
        if (input.status && tasks.length > 0) {
            tasks = tasks.filter((task) => task.Status === input.status);
        }

        return {
            items: tasks,
            ...(providerResponse.info.more_records && { next_cursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
