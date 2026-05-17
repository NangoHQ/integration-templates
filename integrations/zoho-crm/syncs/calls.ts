import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// https://www.zoho.com/crm/developer/docs/api/v2/calls-response.html
const ZohoCallSchema = z.object({
    id: z.string(),
    Subject: z.string().optional(),
    Call_Type: z.string().optional(),
    Call_Purpose: z.string().nullable().optional(),
    Call_Result: z.string().nullable().optional(),
    Call_Duration: z.string().nullable().optional(),
    Call_Duration_in_seconds: z.union([z.string(), z.number()]).nullable().optional(),
    Call_Start_Time: z.string().optional(),
    Description: z.string().nullable().optional(),
    Dialled_Number: z.string().nullable().optional(),
    Caller_ID: z.string().nullable().optional(),
    Reminder: z.string().nullable().optional(),
    Modified_Time: z.string(),
    Created_Time: z.string().optional(),
    Owner: z
        .object({
            name: z.string().optional(),
            id: z.string().optional(),
            email: z.string().optional()
        })
        .optional(),
    Created_By: z
        .object({
            name: z.string().optional(),
            id: z.string().optional(),
            email: z.string().optional()
        })
        .optional(),
    Modified_By: z
        .object({
            name: z.string().optional(),
            id: z.string().optional(),
            email: z.string().optional()
        })
        .optional(),
    What_Id: z
        .object({
            name: z.string().optional(),
            id: z.string().optional()
        })
        .nullable()
        .optional(),
    Who_Id: z
        .object({
            name: z.string().optional(),
            id: z.string().optional()
        })
        .nullable()
        .optional(),
    Tag: z.array(z.object({ name: z.string(), id: z.string() })).optional()
});

const CallSchema = z.object({
    id: z.string(),
    subject: z.string().optional(),
    callType: z.string().optional(),
    callPurpose: z.string().optional(),
    callResult: z.string().optional(),
    callDuration: z.string().optional(),
    callDurationInSeconds: z.string().optional(),
    callStartTime: z.string().optional(),
    description: z.string().optional(),
    dialledNumber: z.string().optional(),
    callerId: z.string().optional(),
    reminder: z.string().optional(),
    modifiedTime: z.string(),
    createdTime: z.string().optional(),
    ownerName: z.string().optional(),
    ownerId: z.string().optional(),
    ownerEmail: z.string().optional(),
    createdByName: z.string().optional(),
    createdById: z.string().optional(),
    modifiedByName: z.string().optional(),
    modifiedById: z.string().optional(),
    relatedToName: z.string().optional(),
    relatedToId: z.string().optional(),
    contactName: z.string().optional(),
    contactId: z.string().optional(),
    tags: z.array(z.string()).optional()
});

// ZodCheckpoint requires z.ZodString | z.ZodNumber | z.ZodBoolean (not ZodOptional)
// Using empty string as default value for first run
const CheckpointSchema = z.object({
    updated_after: z.string()
});

type Call = z.infer<typeof CallSchema>;
type Checkpoint = z.infer<typeof CheckpointSchema>;

// https://www.zoho.com/crm/developer/docs/api/v2/module-samples.html
const InfoSchema = z.object({
    per_page: z.number(),
    count: z.number(),
    page: z.number(),
    more_records: z.boolean(),
    next_page_token: z.string().optional()
});

// https://www.zoho.com/crm/developer/docs/api/v2/get-deleted-records.html
const DeletedRecordSchema = z.object({
    id: z.string(),
    deleted_time: z.string().optional(),
    type: z.string().optional()
});

const sync = createSync<{ Call: typeof CallSchema }, undefined, typeof CheckpointSchema>({
    description: 'Sync calls from Zoho CRM',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/calls' }],
    checkpoint: CheckpointSchema,
    models: {
        Call: CallSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const lastModified = checkpoint?.updated_after;

        // Track the most recent Modified_Time seen in this run
        let maxModifiedTime: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
            endpoint: '/crm/v2/Calls',
            headers: lastModified ? { 'If-Modified-Since': lastModified } : {},
            params: {
                per_page: '200'
            },
            paginate: {
                type: 'cursor',
                limit: 200,
                cursor_path_in_response: 'info.next_page_token',
                cursor_name_in_request: 'page_token',
                response_path: 'data',
                on_page: async ({ response }) => {
                    const parsedInfo = InfoSchema.safeParse(response.data.info);
                    if (parsedInfo.success && !parsedInfo.data.more_records) {
                        // Signal end of pagination when no more records
                        return;
                    }
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const calls: Call[] = [];

            for (const rawCall of page) {
                const parsed = ZohoCallSchema.safeParse(rawCall);
                if (!parsed.success) {
                    await nango.log(`Failed to parse call record: ${JSON.stringify(parsed.error)}`);
                    continue;
                }

                const call = parsed.data;

                // Track the maximum Modified_Time
                if (!maxModifiedTime || call.Modified_Time > maxModifiedTime) {
                    maxModifiedTime = call.Modified_Time;
                }

                calls.push({
                    id: call.id,
                    subject: call.Subject,
                    callType: call.Call_Type,
                    callPurpose: call.Call_Purpose ?? undefined,
                    callResult: call.Call_Result ?? undefined,
                    callDuration: call.Call_Duration ?? undefined,
                    callDurationInSeconds:
                        call.Call_Duration_in_seconds !== null && call.Call_Duration_in_seconds !== undefined
                            ? String(call.Call_Duration_in_seconds)
                            : undefined,
                    callStartTime: call.Call_Start_Time,
                    description: call.Description ?? undefined,
                    dialledNumber: call.Dialled_Number ?? undefined,
                    callerId: call.Caller_ID ?? undefined,
                    reminder: call.Reminder ?? undefined,
                    modifiedTime: call.Modified_Time,
                    createdTime: call.Created_Time,
                    ownerName: call.Owner?.name,
                    ownerId: call.Owner?.id,
                    ownerEmail: call.Owner?.email,
                    createdByName: call.Created_By?.name,
                    createdById: call.Created_By?.id,
                    modifiedByName: call.Modified_By?.name,
                    modifiedById: call.Modified_By?.id,
                    relatedToName: call.What_Id?.name,
                    relatedToId: call.What_Id?.id,
                    contactName: call.Who_Id?.name,
                    contactId: call.Who_Id?.id,
                    tags: call.Tag?.map((t) => t.name)
                });
            }

            if (calls.length > 0) {
                await nango.batchSave(calls, 'Call');
            }
        }

        // Fetch deleted records since the last checkpoint
        if (lastModified) {
            const deletedConfig: ProxyConfiguration = {
                // https://www.zoho.com/crm/developer/docs/api/v2/get-deleted-records.html
                endpoint: '/crm/v2/Calls/deleted',
                headers: { 'If-Modified-Since': lastModified },
                params: {
                    per_page: '200'
                },
                paginate: {
                    type: 'offset',
                    limit: 200,
                    offset_name_in_request: 'page',
                    offset_calculation_method: 'per-page',
                    offset_start_value: 1,
                    response_path: 'data'
                },
                retries: 3
            };

            const deletedCalls: { id: string }[] = [];

            for await (const page of nango.paginate(deletedConfig)) {
                for (const rawRecord of page) {
                    const parsed = DeletedRecordSchema.safeParse(rawRecord);
                    if (parsed.success) {
                        deletedCalls.push({ id: parsed.data.id });
                    }
                }
            }

            if (deletedCalls.length > 0) {
                await nango.batchDelete(deletedCalls, 'Call');
            }
        }

        // Save checkpoint — use current time if no updated calls found (deletion-only runs)
        const newCheckpoint: Checkpoint = { updated_after: maxModifiedTime ?? new Date().toISOString() };
        await nango.saveCheckpoint(newCheckpoint);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
