import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OwnerSchema = z.object({
    name: z.string(),
    id: z.string(),
    email: z.string()
});

const ParticipantSchema = z.object({
    Email: z.string().optional(),
    name: z.string().optional(),
    invited: z.boolean().optional(),
    id: z.string(),
    type: z.string().optional(),
    participant: z.string().optional(),
    status: z.string().optional()
});

const RelatedRecordSchema = z.object({
    name: z.string(),
    id: z.string()
});

const RecurringActivitySchema = z.object({
    RRULE: z.string().optional()
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ProviderEventSchema = z.object({
    id: z.string(),
    Event_Title: z.string().optional(),
    Start_DateTime: z.string().optional(),
    End_DateTime: z.string().optional(),
    All_day: z.boolean().optional(),
    Description: z.string().nullable().optional(),
    Venue: z.string().nullable().optional(),
    Owner: OwnerSchema.optional(),
    Created_By: OwnerSchema.optional(),
    Modified_By: OwnerSchema.optional(),
    Created_Time: z.string(),
    Modified_Time: z.string(),
    Participants: z.array(ParticipantSchema).optional(),
    What_Id: RelatedRecordSchema.nullable().optional(),
    Who_Id: RelatedRecordSchema.nullable().optional(),
    Recurring_Activity: RecurringActivitySchema.nullable().optional(),
    Tag: z.array(z.object({ name: z.string().optional() })).optional(),
    $se_module: z.string().optional()
});

type ProviderEvent = z.infer<typeof _ProviderEventSchema>;

const EventSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    start_datetime: z.string().optional(),
    end_datetime: z.string().optional(),
    all_day: z.boolean().optional(),
    description: z.string().optional(),
    venue: z.string().optional(),
    owner_id: z.string().optional(),
    owner_name: z.string().optional(),
    owner_email: z.string().optional(),
    created_by_id: z.string().optional(),
    modified_by_id: z.string().optional(),
    created_time: z.string(),
    modified_time: z.string(),
    participants: z.array(z.string()).optional(),
    related_record_id: z.string().optional(),
    related_record_type: z.string().optional(),
    tags: z.array(z.string()).optional()
});

// Checkpoint values must be plain string/number/boolean without optional
const CheckpointSchema = z.object({
    modified_after: z.string()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

const DeletedEventSchema = z.object({
    id: z.string()
});

const sync = createSync({
    description: 'Sync events from Zoho CRM',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Event: EventSchema
    },

    endpoints: [
        {
            method: 'GET',
            path: '/syncs/events'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const previousModifiedAfter = checkpoint?.modified_after;

        // Build headers conditionally
        const headers: Record<string, string> = {};
        if (checkpoint?.modified_after != null) {
            headers['If-Modified-Since'] = checkpoint.modified_after;
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
            endpoint: '/crm/v2/Events',
            ...(Object.keys(headers).length > 0 && { headers }),
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 200,
                response_path: 'data'
            },
            retries: 3
        };

        let maxModifiedTime: string | undefined;

        for await (const events of nango.paginate<ProviderEvent>(proxyConfig)) {
            if (events.length === 0) {
                continue;
            }

            const normalizedEvents = events.map((event) => {
                const participantIds = event.Participants?.map((p) => p.id) || [];
                const tags = event.Tag?.map((t) => t.name).filter((name): name is string => name != null) || [];

                return {
                    id: event.id,
                    ...(event.Event_Title != null && { title: event.Event_Title }),
                    ...(event.Start_DateTime != null && { start_datetime: event.Start_DateTime }),
                    ...(event.End_DateTime != null && { end_datetime: event.End_DateTime }),
                    ...(event.All_day != null && { all_day: event.All_day }),
                    ...(event.Description != null && { description: event.Description }),
                    ...(event.Venue != null && { venue: event.Venue }),
                    ...(event.Owner?.id != null && { owner_id: event.Owner.id }),
                    ...(event.Owner?.name != null && { owner_name: event.Owner.name }),
                    ...(event.Owner?.email != null && { owner_email: event.Owner.email }),
                    ...(event.Created_By?.id != null && { created_by_id: event.Created_By.id }),
                    ...(event.Modified_By?.id != null && { modified_by_id: event.Modified_By.id }),
                    created_time: event.Created_Time,
                    modified_time: event.Modified_Time,
                    ...(participantIds.length > 0 && { participants: participantIds }),
                    ...(event.What_Id?.id != null && { related_record_id: event.What_Id.id }),
                    ...(event.$se_module != null && { related_record_type: event.$se_module }),
                    ...(tags.length > 0 && { tags })
                };
            });

            await nango.batchSave(normalizedEvents, 'Event');

            // Track the maximum Modified_Time for checkpoint
            for (const event of events) {
                if (maxModifiedTime === undefined || new Date(event.Modified_Time) > new Date(maxModifiedTime)) {
                    maxModifiedTime = event.Modified_Time;
                }
            }
        }

        if (previousModifiedAfter) {
            const deletedEvents: Array<{ id: string }> = [];
            const deletedProxyConfig: ProxyConfiguration = {
                // https://www.zoho.com/crm/developer/docs/api/v2/get-deleted-records.html
                endpoint: '/crm/v2/Events/deleted',
                headers: {
                    'If-Modified-Since': previousModifiedAfter
                },
                params: {
                    type: 'all'
                },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_start_value: 1,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'per_page',
                    limit: 200,
                    response_path: 'data'
                },
                retries: 3
            };

            for await (const pageResults of nango.paginate<z.infer<typeof DeletedEventSchema>>(deletedProxyConfig)) {
                for (const rawRecord of pageResults) {
                    const parsedRecord = DeletedEventSchema.safeParse(rawRecord);
                    if (parsedRecord.success) {
                        deletedEvents.push({ id: parsedRecord.data.id });
                    }
                }
            }

            if (deletedEvents.length > 0) {
                await nango.batchDelete(deletedEvents, 'Event');
            }
        }

        // Save checkpoint — use current time if no updated events were found (deletion-only runs)
        const newCheckpoint: Checkpoint = {
            modified_after: maxModifiedTime ?? new Date().toISOString()
        };
        await nango.saveCheckpoint(newCheckpoint);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
