import { z } from 'zod';
import { createAction } from 'nango';

// Zoho CRM API reference: https://www.zoho.com/crm/developer/docs/api/v2/get-records.html

const InputSchema = z.object({
    page: z.number().int().min(1).optional().describe('Page number for pagination. Starts at 1.'),
    per_page: z.number().int().min(1).max(200).optional().describe('Number of records per page. Max 200.'),
    fields: z.string().optional().describe('Comma-separated field API names to retrieve specific fields.'),
    sort_by: z.string().optional().describe('Field API name to sort by.'),
    sort_order: z.enum(['asc', 'desc']).optional().describe('Sort order: asc or desc.'),
    ids: z.string().optional().describe('Comma-separated record IDs to fetch specific records.'),
    cvid: z.string().optional().describe('Custom View ID to filter records.')
});

const OwnerSchema = z.object({
    name: z.string().optional(),
    id: z.string().optional(),
    email: z.string().optional()
});

const CreatedBySchema = z.object({
    name: z.string().optional(),
    id: z.string().optional(),
    email: z.string().optional()
});

const ModifiedBySchema = z.object({
    name: z.string().optional(),
    id: z.string().optional(),
    email: z.string().optional()
});

// Provider response schema for a Call record
const ProviderCallSchema = z
    .object({
        id: z.string(),
        Subject: z.string().nullable().optional(),
        Call_Type: z.string().nullable().optional(),
        Call_Purpose: z.string().nullable().optional(),
        Call_Duration: z.string().nullable().optional(),
        Call_Duration_in_seconds: z.number().nullable().optional(),
        Description: z.string().nullable().optional(),
        Billable: z.boolean().nullable().optional(),
        Call_Start_Time: z.string().nullable().optional(),
        Call_End_Time: z.string().nullable().optional(),
        Call_Status: z.string().nullable().optional(),
        Outgoing_Call_Status: z.string().nullable().optional(),
        Scheduled_In: z.string().nullable().optional(),
        Created_Time: z.string().optional(),
        Modified_Time: z.string().optional(),
        Owner: OwnerSchema.optional(),
        Created_By: CreatedBySchema.optional(),
        Modified_By: ModifiedBySchema.optional(),
        $editable: z.boolean().optional(),
        $approved: z.boolean().optional()
    })
    .passthrough();

const ProviderInfoSchema = z.object({
    per_page: z.number().int(),
    count: z.number().int(),
    page: z.number().int(),
    more_records: z.boolean(),
    call: z.boolean().optional(),
    email: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown()),
    info: ProviderInfoSchema
});

const CallSchema = z.object({
    id: z.string(),
    subject: z.string().optional(),
    callType: z.string().optional(),
    callPurpose: z.string().optional(),
    callDuration: z.string().optional(),
    callDurationInSeconds: z.number().optional(),
    description: z.string().optional(),
    billable: z.boolean().optional(),
    callStartTime: z.string().optional(),
    callEndTime: z.string().optional(),
    callStatus: z.string().optional(),
    outgoingCallStatus: z.string().optional(),
    scheduledIn: z.string().optional(),
    createdTime: z.string().optional(),
    modifiedTime: z.string().optional(),
    owner: OwnerSchema.optional(),
    createdBy: CreatedBySchema.optional(),
    modifiedBy: ModifiedBySchema.optional(),
    editable: z.boolean().optional(),
    approved: z.boolean().optional()
});

const OutputSchema = z.object({
    calls: z.array(CallSchema),
    page: z.number().int(),
    perPage: z.number().int(),
    count: z.number().int(),
    hasMore: z.boolean()
});

const action = createAction({
    description: 'List calls from Zoho CRM.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.calls.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
        const response = await nango.get({
            endpoint: '/crm/v2/Calls',
            params: {
                page: input.page ?? 1,
                ...(input.per_page !== undefined && { per_page: input.per_page }),
                ...(input.fields !== undefined && { fields: input.fields }),
                ...(input.sort_by !== undefined && { sort_by: input.sort_by }),
                ...(input.sort_order !== undefined && { sort_order: input.sort_order }),
                ...(input.ids !== undefined && { ids: input.ids }),
                ...(input.cvid !== undefined && { cvid: input.cvid })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const calls = providerResponse.data.map((item) => {
            const call = ProviderCallSchema.parse(item);
            return {
                id: call.id,
                ...(call.Subject != null && { subject: call.Subject }),
                ...(call.Call_Type != null && { callType: call.Call_Type }),
                ...(call.Call_Purpose != null && { callPurpose: call.Call_Purpose }),
                ...(call.Call_Duration != null && { callDuration: call.Call_Duration }),
                ...(call.Call_Duration_in_seconds != null && { callDurationInSeconds: call.Call_Duration_in_seconds }),
                ...(call.Description != null && { description: call.Description }),
                ...(call.Billable != null && { billable: call.Billable }),
                ...(call.Call_Start_Time != null && { callStartTime: call.Call_Start_Time }),
                ...(call.Call_End_Time != null && { callEndTime: call.Call_End_Time }),
                ...(call.Call_Status != null && { callStatus: call.Call_Status }),
                ...(call.Outgoing_Call_Status != null && { outgoingCallStatus: call.Outgoing_Call_Status }),
                ...(call.Scheduled_In != null && { scheduledIn: call.Scheduled_In }),
                ...(call.Created_Time !== undefined && { createdTime: call.Created_Time }),
                ...(call.Modified_Time !== undefined && { modifiedTime: call.Modified_Time }),
                ...(call.Owner !== undefined && { owner: call.Owner }),
                ...(call.Created_By !== undefined && { createdBy: call.Created_By }),
                ...(call.Modified_By !== undefined && { modifiedBy: call.Modified_By }),
                ...(call['$editable'] !== undefined && { editable: call['$editable'] }),
                ...(call['$approved'] !== undefined && { approved: call['$approved'] })
            };
        });

        return {
            calls,
            page: providerResponse.info.page,
            perPage: providerResponse.info.per_page,
            count: providerResponse.info.count,
            hasMore: providerResponse.info.more_records
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
