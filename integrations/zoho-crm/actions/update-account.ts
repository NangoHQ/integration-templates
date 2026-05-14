import { z } from 'zod';
import { createAction } from 'nango';

// Input schema for updating an account
const InputSchema = z.object({
    id: z.string().describe('The unique ID of the account to update. Example: "1234567890123456789"'),
    Account_Name: z.string().optional().describe('The name of the account.'),
    Phone: z.string().optional().describe('The phone number of the account.'),
    Website: z.string().optional().describe('The website URL of the account.'),
    Industry: z.string().optional().describe('The industry type of the account.'),
    Billing_Street: z.string().optional().describe('The billing street address.'),
    Billing_City: z.string().optional().describe('The billing city.'),
    Billing_State: z.string().optional().describe('The billing state.'),
    Billing_Country: z.string().optional().describe('The billing country.'),
    Billing_Code: z.string().optional().describe('The billing postal/ZIP code.'),
    Shipping_Street: z.string().optional().describe('The shipping street address.'),
    Shipping_City: z.string().optional().describe('The shipping city.'),
    Shipping_State: z.string().optional().describe('The shipping state.'),
    Shipping_Country: z.string().optional().describe('The shipping country.'),
    Shipping_Code: z.string().optional().describe('The shipping postal/ZIP code.'),
    Employees: z.number().optional().describe('Number of employees.'),
    Annual_Revenue: z.number().optional().describe('Annual revenue of the account.'),
    Description: z.string().optional().describe('Description of the account.'),
    trigger: z.array(z.string()).optional().describe('Triggers to execute (approval, workflow, blueprint).')
});

// Output schema for update action
const OutputSchema = z.object({
    id: z.string()
});

const action = createAction({
    description: 'Update an account in Zoho CRM',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-account',
        group: 'Accounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.accounts.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Build update payload with only provided fields
        const updateData: Record<string, unknown> = {
            id: input.id
        };

        if (input['Account_Name'] !== undefined) {
            updateData['Account_Name'] = input['Account_Name'];
        }
        if (input['Phone'] !== undefined) {
            updateData['Phone'] = input['Phone'];
        }
        if (input['Website'] !== undefined) {
            updateData['Website'] = input['Website'];
        }
        if (input['Industry'] !== undefined) {
            updateData['Industry'] = input['Industry'];
        }
        if (input['Billing_Street'] !== undefined) {
            updateData['Billing_Street'] = input['Billing_Street'];
        }
        if (input['Billing_City'] !== undefined) {
            updateData['Billing_City'] = input['Billing_City'];
        }
        if (input['Billing_State'] !== undefined) {
            updateData['Billing_State'] = input['Billing_State'];
        }
        if (input['Billing_Country'] !== undefined) {
            updateData['Billing_Country'] = input['Billing_Country'];
        }
        if (input['Billing_Code'] !== undefined) {
            updateData['Billing_Code'] = input['Billing_Code'];
        }
        if (input['Shipping_Street'] !== undefined) {
            updateData['Shipping_Street'] = input['Shipping_Street'];
        }
        if (input['Shipping_City'] !== undefined) {
            updateData['Shipping_City'] = input['Shipping_City'];
        }
        if (input['Shipping_State'] !== undefined) {
            updateData['Shipping_State'] = input['Shipping_State'];
        }
        if (input['Shipping_Country'] !== undefined) {
            updateData['Shipping_Country'] = input['Shipping_Country'];
        }
        if (input['Shipping_Code'] !== undefined) {
            updateData['Shipping_Code'] = input['Shipping_Code'];
        }
        if (input['Employees'] !== undefined) {
            updateData['Employees'] = input['Employees'];
        }
        if (input['Annual_Revenue'] !== undefined) {
            updateData['Annual_Revenue'] = input['Annual_Revenue'];
        }
        if (input['Description'] !== undefined) {
            updateData['Description'] = input['Description'];
        }

        const requestBody: Record<string, unknown> = {
            data: [updateData]
        };

        if (input['trigger'] !== undefined && input['trigger'].length > 0) {
            requestBody['trigger'] = input['trigger'];
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/update-records.html
        const response = await nango.put({
            endpoint: `/crm/v2/Accounts/${input.id}`,
            data: requestBody,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'no_response',
                message: 'No response received from Zoho CRM API'
            });
        }

        // Parse response data using Zod
        // Zoho update response structure: { data: [{ code, details: { id, ... }, message, status }] }
        const ResponseDataSchema = z.object({
            data: z
                .array(
                    z.object({
                        code: z.string(),
                        details: z.object({
                            id: z.string()
                        }),
                        message: z.string(),
                        status: z.string()
                    })
                )
                .min(1)
        });

        let responseData; // @allowTryCatch
        try {
            responseData = ResponseDataSchema.parse(response.data);
        } catch {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response structure from Zoho CRM API'
            });
        }

        const responseItem = responseData.data[0];
        if (!responseItem) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Response data array is empty'
            });
        }

        // Check for error response
        if (responseItem.status !== 'success') {
            throw new nango.ActionError({
                type: 'update_failed',
                message: responseItem.message,
                code: responseItem.code
            });
        }

        // Return the updated account ID
        return {
            id: responseItem.details.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
