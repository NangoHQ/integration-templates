import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    record_id: z.string().describe('The unique ID of the lead record to update. Example: "410888000000698006"'),
    Company: z.string().optional().describe('Company name of the lead.'),
    Last_Name: z.string().optional().describe('Last name of the lead.'),
    First_Name: z.string().optional().describe('First name of the lead.'),
    Email: z.string().optional().describe('Email address of the lead.'),
    Phone: z.string().optional().describe('Phone number of the lead.'),
    Mobile: z.string().optional().describe('Mobile number of the lead.'),
    Title: z.string().optional().describe('Job title of the lead.'),
    Department: z.string().optional().describe('Department of the lead.'),
    Industry: z.string().optional().describe('Industry of the lead.'),
    Website: z.string().optional().describe('Website URL of the lead.'),
    City: z.string().optional().describe('City of the lead address.'),
    State: z.string().optional().describe('State of the lead address.'),
    Country: z.string().optional().describe('Country of the lead address.'),
    Street: z.string().optional().describe('Street address of the lead.'),
    Zip_Code: z.string().optional().describe('ZIP/Postal code of the lead address.'),
    Lead_Status: z.string().optional().describe('Status of the lead.'),
    Lead_Source: z.string().optional().describe('Source of the lead.'),
    Rating: z.string().optional().describe('Rating of the lead.'),
    Description: z.string().optional().describe('Description or notes about the lead.'),
    Annual_Revenue: z.number().optional().describe('Annual revenue of the company.'),
    No_of_Employees: z.number().optional().describe('Number of employees in the company.'),
    Skype_ID: z.string().optional().describe('Skype ID of the lead.'),
    Twitter: z.string().optional().describe('Twitter handle of the lead.'),
    Secondary_Email: z.string().optional().describe('Secondary email of the lead.')
});

const ApiResponseItemSchema = z.object({
    code: z.string().optional(),
    status: z.string().optional(),
    message: z.string().optional(),
    details: z
        .object({
            id: z.string().optional()
        })
        .passthrough()
        .optional()
});

const ApiResponseSchema = z.object({
    data: z.array(ApiResponseItemSchema)
});

const OutputSchema = z.object({
    success: z.boolean(),
    record_id: z.string(),
    message: z.string()
});

const action = createAction({
    description: 'Update a lead in Zoho CRM',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-lead',
        group: 'Leads'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.leads.ALL', 'ZohoCRM.modules.leads.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const { record_id, ...leadFields } = input;

        // Build the update payload with only provided fields
        const data: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(leadFields)) {
            if (value !== undefined) {
                data[key] = value;
            }
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/update-specific-record.html
        const response = await nango.put({
            endpoint: `/crm/v2/Leads/${record_id}`,
            data: {
                data: [data]
            },
            retries: 3
        });

        const parsedResponse = ApiResponseSchema.safeParse(response.data);

        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response structure from Zoho CRM API'
            });
        }

        if (parsedResponse.data.data.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Empty response data from Zoho CRM API'
            });
        }

        const firstItem = parsedResponse.data.data[0];
        if (firstItem === undefined) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'First item in response data is undefined'
            });
        }

        // Extract fields from response with safe defaults
        const code = firstItem.code ?? 'UNKNOWN';
        const status = firstItem.status ?? 'unknown';
        const message = firstItem.message ?? 'Update completed';

        // Extract details.id if available
        const responseRecordId = firstItem.details?.id ?? record_id;

        if (status !== 'success') {
            throw new nango.ActionError({
                type: 'update_failed',
                message: message,
                code: code
            });
        }

        return {
            success: true,
            record_id: responseRecordId,
            message: message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
