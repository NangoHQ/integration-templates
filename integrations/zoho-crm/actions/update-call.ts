import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Unique ID of the call to update. Example: "4150868000002792048"'),
    Subject: z.string().optional().describe('Subject of the call. Example: "Outgoing call to Patricia Boyle"'),
    Call_Type: z.enum(['Inbound', 'Outbound']).optional().describe('Whether the call is inbound or outbound'),
    Call_Purpose: z.string().optional().describe('Purpose of the call. Example: "Prospecting"'),
    Call_Status: z.string().optional().describe('Status of the call. Example: "Attended Dialled"'),
    Call_Duration: z.string().optional().describe('Duration of the call in mm:ss format. Example: "10:00"'),
    Call_Result: z.string().optional().describe('Result of the call. Example: "Not interested"'),
    Description: z.string().optional().describe('Description of the call'),
    Call_Start_Time: z.string().optional().describe('Start date and time of the call in ISO format. Example: "2020-08-02T21:30:00+05:30"'),
    Who_Id: z.string().optional().describe('ID of the Contact or Lead associated with the call'),
    What_Id: z.string().optional().describe('ID of the Account associated with the call')
});

const OwnerSchema = z.object({
    name: z.string(),
    id: z.string(),
    email: z.string().optional()
});

const WhoIdSchema = z.object({
    name: z.string(),
    id: z.string()
});

const WhatIdSchema = z.object({
    name: z.string(),
    id: z.string()
});

const UpdateResponseDataSchema = z.object({
    code: z.string(),
    details: z
        .object({
            id: z.string().optional()
        })
        .passthrough(),
    message: z.string(),
    status: z.string()
});

const UpdateResponseSchema = z.object({
    data: z.array(UpdateResponseDataSchema)
});

const GetCallResponseDataSchema = z.object({
    id: z.string(),
    Subject: z.string().optional(),
    Call_Type: z.string().optional(),
    Call_Purpose: z.string().nullable().optional(),
    Call_Status: z.string().optional(),
    Call_Duration: z.string().optional(),
    Call_Result: z.string().nullable().optional(),
    Description: z.string().optional(),
    Call_Start_Time: z.string().optional(),
    Owner: OwnerSchema.nullable().optional(),
    Who_Id: WhoIdSchema.nullable().optional(),
    What_Id: WhatIdSchema.nullable().optional(),
    Created_Time: z.string().optional(),
    Modified_Time: z.string().optional()
});

const GetCallResponseSchema = z.object({
    data: z.array(GetCallResponseDataSchema)
});

const OutputSchema = z.object({
    id: z.string(),
    Subject: z.string().optional(),
    Call_Type: z.string().optional(),
    Call_Purpose: z.string().optional(),
    Call_Status: z.string().optional(),
    Call_Duration: z.string().optional(),
    Call_Result: z.string().optional(),
    Description: z.string().optional(),
    Call_Start_Time: z.string().optional(),
    Owner: z
        .object({
            name: z.string(),
            id: z.string(),
            email: z.string().optional()
        })
        .nullable()
        .optional(),
    Who_Id: z
        .object({
            name: z.string(),
            id: z.string()
        })
        .nullable()
        .optional(),
    What_Id: z
        .object({
            name: z.string(),
            id: z.string()
        })
        .nullable()
        .optional(),
    Created_Time: z.string().optional(),
    Modified_Time: z.string().optional()
});

const action = createAction({
    description: 'Update a call in Zoho CRM',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.calls.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        interface UpdateData {
            id: string;
            Subject?: string;
            Call_Type?: 'Inbound' | 'Outbound';
            Call_Purpose?: string;
            Call_Status?: string;
            Call_Duration?: string;
            Call_Result?: string;
            Description?: string;
            Call_Start_Time?: string;
            Who_Id?: { id: string };
            What_Id?: { id: string };
        }

        const updateData: UpdateData = {
            id: input.id
        };

        if (input.Subject !== undefined) {
            updateData.Subject = input.Subject;
        }
        if (input.Call_Type !== undefined) {
            updateData.Call_Type = input.Call_Type;
        }
        if (input.Call_Purpose !== undefined) {
            updateData.Call_Purpose = input.Call_Purpose;
        }
        if (input.Call_Status !== undefined) {
            updateData.Call_Status = input.Call_Status;
        }
        if (input.Call_Duration !== undefined) {
            updateData.Call_Duration = input.Call_Duration;
        }
        if (input.Call_Result !== undefined) {
            updateData.Call_Result = input.Call_Result;
        }
        if (input.Description !== undefined) {
            updateData.Description = input.Description;
        }
        if (input.Call_Start_Time !== undefined) {
            updateData.Call_Start_Time = input.Call_Start_Time;
        }
        if (input.Who_Id !== undefined) {
            updateData.Who_Id = { id: input.Who_Id };
        }
        if (input.What_Id !== undefined) {
            updateData.What_Id = { id: input.What_Id };
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/update-specific-record.html
        const updateResponse = await nango.put({
            endpoint: `crm/v2/Calls/${input.id}`,
            data: {
                data: [updateData]
            },
            retries: 3
        });

        const updateParsed = UpdateResponseSchema.parse(updateResponse.data);
        const updateResult = updateParsed.data[0];

        if (!updateResult) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Call record not found or update failed'
            });
        }

        if (updateResult.status !== 'success') {
            throw new nango.ActionError({
                type: 'update_failed',
                message: updateResult.message,
                code: updateResult.code
            });
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
        const getResponse = await nango.get({
            endpoint: `crm/v2/Calls/${input.id}`,
            retries: 3
        });

        const getParsed = GetCallResponseSchema.parse(getResponse.data);
        const record = getParsed.data[0];

        if (!record) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Updated call record could not be retrieved'
            });
        }

        return {
            id: record.id,
            Subject: record.Subject,
            Call_Type: record.Call_Type,
            Call_Purpose: record.Call_Purpose ?? undefined,
            Call_Status: record.Call_Status,
            Call_Duration: record.Call_Duration,
            Call_Result: record.Call_Result ?? undefined,
            Description: record.Description,
            Call_Start_Time: record.Call_Start_Time,
            Owner: record.Owner ?? undefined,
            Who_Id: record.Who_Id ?? undefined,
            What_Id: record.What_Id ?? undefined,
            Created_Time: record.Created_Time,
            Modified_Time: record.Modified_Time
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
