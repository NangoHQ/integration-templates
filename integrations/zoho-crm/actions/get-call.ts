import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    record_id: z.string().describe('The unique ID of the call record to retrieve. Example: "4150868000002792048"')
});

const UserSchema = z.object({
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

const ApprovalSchema = z.object({
    delegate: z.boolean(),
    approve: z.boolean(),
    reject: z.boolean(),
    resubmit: z.boolean()
});

const ProviderCallSchema = z.object({
    id: z.string(),
    Subject: z.string().optional(),
    Call_Type: z.string().optional(),
    Call_Status: z.string().optional(),
    Call_Purpose: z.string().optional(),
    Call_Result: z.string().optional(),
    Call_Duration: z.string().optional(),
    Call_Duration_in_seconds: z.union([z.string(), z.number()]).optional(),
    Call_Start_Time: z.string().optional(),
    Call_Agenda: z.string().nullable().optional(),
    Description: z.string().nullable().optional(),
    Owner: UserSchema.optional(),
    Created_By: UserSchema.optional(),
    Modified_By: UserSchema.optional(),
    Who_Id: WhoIdSchema.optional(),
    What_Id: WhatIdSchema.optional(),
    Created_Time: z.string().optional(),
    Modified_Time: z.string().optional(),
    Reminder: z.string().nullable().optional(),
    Caller_ID: z.string().nullable().optional(),
    Dialled_Number: z.string().nullable().optional(),
    Tag: z.array(z.object({})).optional(),
    $currency_symbol: z.string().optional(),
    $calendar_booking_call: z.boolean().optional(),
    $review_process: z.unknown().nullable().optional(),
    $review: z.unknown().nullable().optional(),
    $process_flow: z.boolean().optional(),
    $approved: z.boolean().optional(),
    $approval: ApprovalSchema.optional(),
    $editable: z.boolean().optional(),
    $orchestration: z.boolean().optional(),
    $se_module: z.string().optional(),
    $in_merge: z.boolean().optional(),
    $approval_state: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    subject: z.string().optional(),
    call_type: z.string().optional(),
    call_status: z.string().optional(),
    call_purpose: z.string().optional(),
    call_result: z.string().optional(),
    call_duration: z.string().optional(),
    call_duration_in_seconds: z.union([z.string(), z.number()]).optional(),
    call_start_time: z.string().optional(),
    call_agenda: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    owner: z
        .object({
            name: z.string(),
            id: z.string(),
            email: z.string().optional()
        })
        .optional(),
    created_by: z
        .object({
            name: z.string(),
            id: z.string(),
            email: z.string().optional()
        })
        .optional(),
    modified_by: z
        .object({
            name: z.string(),
            id: z.string(),
            email: z.string().optional()
        })
        .optional(),
    who_id: z
        .object({
            name: z.string(),
            id: z.string()
        })
        .optional(),
    what_id: z
        .object({
            name: z.string(),
            id: z.string()
        })
        .optional(),
    created_time: z.string().optional(),
    modified_time: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single call from Zoho CRM',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.calls.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
        const response = await nango.get({
            endpoint: `crm/v2/Calls/${input.record_id}`,
            retries: 3
        });

        if (!response.data || !Array.isArray(response.data.data) || response.data.data.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Call record not found',
                record_id: input.record_id
            });
        }

        const providerCall = ProviderCallSchema.parse(response.data.data[0]);

        return {
            id: providerCall.id,
            ...(providerCall.Subject !== undefined && { subject: providerCall.Subject }),
            ...(providerCall.Call_Type !== undefined && { call_type: providerCall.Call_Type }),
            ...(providerCall.Call_Status !== undefined && { call_status: providerCall.Call_Status }),
            ...(providerCall.Call_Purpose !== undefined && { call_purpose: providerCall.Call_Purpose }),
            ...(providerCall.Call_Result !== undefined && { call_result: providerCall.Call_Result }),
            ...(providerCall.Call_Duration !== undefined && { call_duration: providerCall.Call_Duration }),
            ...(providerCall.Call_Duration_in_seconds !== undefined && { call_duration_in_seconds: providerCall.Call_Duration_in_seconds }),
            ...(providerCall.Call_Start_Time !== undefined && { call_start_time: providerCall.Call_Start_Time }),
            ...(providerCall.Call_Agenda !== undefined && { call_agenda: providerCall.Call_Agenda }),
            ...(providerCall.Description !== undefined && { description: providerCall.Description }),
            ...(providerCall.Owner !== undefined && {
                owner: {
                    name: providerCall.Owner.name,
                    id: providerCall.Owner.id,
                    ...(providerCall.Owner.email !== undefined && { email: providerCall.Owner.email })
                }
            }),
            ...(providerCall.Created_By !== undefined && {
                created_by: {
                    name: providerCall.Created_By.name,
                    id: providerCall.Created_By.id,
                    ...(providerCall.Created_By.email !== undefined && { email: providerCall.Created_By.email })
                }
            }),
            ...(providerCall.Modified_By !== undefined && {
                modified_by: {
                    name: providerCall.Modified_By.name,
                    id: providerCall.Modified_By.id,
                    ...(providerCall.Modified_By.email !== undefined && { email: providerCall.Modified_By.email })
                }
            }),
            ...(providerCall.Who_Id !== undefined && {
                who_id: {
                    name: providerCall.Who_Id.name,
                    id: providerCall.Who_Id.id
                }
            }),
            ...(providerCall.What_Id !== undefined && {
                what_id: {
                    name: providerCall.What_Id.name,
                    id: providerCall.What_Id.id
                }
            }),
            ...(providerCall.Created_Time !== undefined && { created_time: providerCall.Created_Time }),
            ...(providerCall.Modified_Time !== undefined && { modified_time: providerCall.Modified_Time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
