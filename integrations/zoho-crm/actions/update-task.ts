import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique ID of the task to update. Example: "5472636000003123001"'),
    subject: z.string().optional().describe('The subject/title of the task. Example: "Follow up with lead"'),
    status: z.string().optional().describe('The status of the task. Example: "Not Started", "In Progress", "Completed"'),
    priority: z.string().optional().describe('The priority of the task. Example: "High", "Medium", "Low"'),
    due_date: z.string().optional().describe('The due date of the task in ISO 8601 format. Example: "2026-05-15"'),
    description: z.string().nullable().optional().describe('The description of the task. Use null to clear.'),
    who_id: z.string().optional().describe('The Contact ID to associate with this task (Who_Id). Example: "5472636000003123002"'),
    what_id: z.string().optional().describe('The related record ID to associate with this task (What_Id). Example: "5472636000003123003"'),
    se_module: z.string().optional().describe('The module name of the related record. Required when what_id is provided. Example: "Leads", "Accounts", "Deals"')
});

const DataDetailsSchema = z.object({
    id: z.string().optional(),
    code: z.string().optional(),
    message: z.string().optional(),
    status: z.string().optional()
});

const DataItemSchema = z.object({
    code: z.string(),
    details: DataDetailsSchema.optional(),
    message: z.string(),
    status: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.array(DataItemSchema)
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Update a task in Zoho CRM.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-task',
        group: 'Tasks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            id: input.id
        };

        if (input.subject !== undefined) {
            data['Subject'] = input.subject;
        }
        if (input.status !== undefined) {
            data['Status'] = input.status;
        }
        if (input.priority !== undefined) {
            data['Priority'] = input.priority;
        }
        if (input.due_date !== undefined) {
            data['Due_Date'] = input.due_date;
        }
        if (input.description !== undefined) {
            data['Description'] = input.description;
        }
        if (input.who_id !== undefined) {
            data['Who_Id'] = { id: input.who_id };
        }
        if (input.what_id !== undefined) {
            data['What_Id'] = { id: input.what_id };
        }
        if (input.se_module !== undefined) {
            data['$se_module'] = input.se_module;
        }

        const requestBody = {
            data: [data]
        };

        // https://www.zoho.com/crm/developer/docs/api/v2/modules-api.html
        const response = await nango.put({
            endpoint: `/crm/v2/Tasks/${input.id}`,
            data: requestBody,
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.parse(response.data);
        const result = parsedResponse.data[0];

        if (!result) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Empty response from Zoho CRM API'
            });
        }

        if (result.code !== 'SUCCESS') {
            throw new nango.ActionError({
                type: 'update_failed',
                code: result.code,
                message: result.message
            });
        }

        return {
            id: result.details?.id || input.id,
            success: result.code === 'SUCCESS',
            message: result.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
