import { z } from 'zod';
import { createAction } from 'nango';

const WhoIdSchema = z.object({
    id: z.string().describe('ID of the contact. Example: "3652397000000649013"'),
    name: z.string().optional().describe('Name of the contact. Example: "Patricia Boyle"')
});

const WhatIdSchema = z.object({
    id: z.string().describe('ID of the record. Example: "3652397000000649013"'),
    name: z.string().optional().describe('Name of the record.')
});

const InputSchema = z.object({
    Subject: z.string().describe('Subject of the call. Accepts up to 255 characters, alphanumeric and special characters.'),
    Call_Type: z.enum(['Inbound', 'Outbound', 'Missed']).describe('The type of call.'),
    Who_Id: WhoIdSchema.optional().describe('The contact to associate the call with. Required for scheduled calls.'),
    What_Id: WhatIdSchema.optional().describe('The record (other than Contact) to associate the call with. Required for scheduled calls.'),
    $se_module: z.string().optional().describe('The API name of the module of the record specified in What_Id. Required when What_Id is provided.'),
    Call_Start_Time: z
        .string()
        .optional()
        .describe(
            'The date and time at which the call started in ISO8601 format. Example: "2021-02-23T13:30:00+05:30". Required for scheduled and completed calls.'
        ),
    Call_Duration: z.string().optional().describe('The time duration in HH:mm format that the call lasted for. Required for completed calls.'),
    Outbound_Call_Status: z.enum(['Scheduled', 'Completed']).optional().describe('The status of the outbound call.'),
    Call_Purpose: z.string().optional().describe('The purpose of the call.'),
    Description: z.string().optional().describe('Description of the call.')
});

const ProviderCallResponseSchema = z.object({
    data: z.array(
        z
            .object({
                code: z.string(),
                details: z
                    .object({
                        id: z.string().optional(),
                        Created_Time: z.string().optional(),
                        Modified_Time: z.string().optional(),
                        Created_By: z
                            .object({
                                id: z.string().optional(),
                                name: z.string().optional()
                            })
                            .optional(),
                        Modified_By: z
                            .object({
                                id: z.string().optional(),
                                name: z.string().optional()
                            })
                            .optional()
                    })
                    .passthrough(),
                message: z.string(),
                status: z.string()
            })
            .passthrough()
    )
});

const OutputSchema = z.object({
    id: z.string().describe('ID of the created call record.'),
    success: z.boolean().describe('Whether the call was created successfully.'),
    message: z.string().describe('Status message from the API.')
});

const action = createAction({
    description: 'Create a call in Zoho CRM',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-call',
        group: 'Calls'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.calls.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            data: [
                {
                    Subject: input.Subject,
                    Call_Type: input.Call_Type,
                    ...(input.Who_Id !== undefined && { Who_Id: input.Who_Id }),
                    ...(input.What_Id !== undefined && { What_Id: input.What_Id }),
                    ...(input.$se_module !== undefined && { $se_module: input.$se_module }),
                    ...(input.Call_Start_Time !== undefined && { Call_Start_Time: input.Call_Start_Time }),
                    ...(input.Call_Duration !== undefined && { Call_Duration: input.Call_Duration }),
                    ...(input.Outbound_Call_Status !== undefined && { Outbound_Call_Status: input.Outbound_Call_Status }),
                    ...(input.Call_Purpose !== undefined && { Call_Purpose: input.Call_Purpose }),
                    ...(input.Description !== undefined && { Description: input.Description })
                }
            ]
        };

        // https://www.zoho.com/crm/developer/docs/api/v2/insert-records.html
        const response = await nango.post({
            endpoint: 'crm/v2/Calls',
            data: requestBody,
            retries: 10
        });

        const parsedResponse = ProviderCallResponseSchema.parse(response.data);
        const result = parsedResponse.data[0];

        if (result === undefined) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'No data returned from Zoho CRM API'
            });
        }

        if (result.status === 'error') {
            throw new nango.ActionError({
                type: 'api_error',
                message: result.message,
                code: result.code
            });
        }

        const callId = result.details.id;
        if (callId === undefined) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Call ID not found in response'
            });
        }

        return {
            id: callId,
            success: result.status === 'success',
            message: result.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
