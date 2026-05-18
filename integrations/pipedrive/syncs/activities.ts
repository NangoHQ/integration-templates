import { createSync } from 'nango';
import { z } from 'zod';

// Provider response schema for Pipedrive activities
// https://developers.pipedrive.com/docs/api/v1/Activities
const _PipedriveActivitySchema = z.object({
    id: z.number(),
    subject: z.string().optional(),
    type: z.string().optional(),
    done: z.boolean().optional(),
    due_date: z.string().optional(),
    due_time: z.string().optional(),
    duration: z.string().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional(),
    user_id: z.number().optional(),
    deal_id: z.number().optional(),
    person_id: z.number().optional(),
    org_id: z.number().optional(),
    lead_id: z.string().optional(),
    note: z.string().optional(),
    active_flag: z.boolean().optional(),
    public_description: z.string().optional(),
    busy_flag: z.boolean().optional(),
    marked_as_done_time: z.string().optional(),
    created_by_user_id: z.number().optional(),
    assigned_to_user_id: z.number().optional()
});

type PipedriveActivity = z.infer<typeof _PipedriveActivitySchema>;

// Normalized Activity model for the sync
const ActivitySchema = z.object({
    id: z.string(),
    subject: z.string().optional(),
    type: z.string().optional(),
    done: z.boolean().optional(),
    due_date: z.string().optional(),
    due_time: z.string().optional(),
    duration: z.string().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional(),
    user_id: z.number().optional(),
    deal_id: z.number().optional(),
    person_id: z.number().optional(),
    org_id: z.number().optional(),
    lead_id: z.string().optional(),
    note: z.string().optional(),
    active_flag: z.boolean().optional(),
    public_description: z.string().optional(),
    busy_flag: z.boolean().optional(),
    marked_as_done_time: z.string().optional(),
    created_by_user_id: z.number().optional(),
    assigned_to_user_id: z.number().optional()
});

// Checkpoint schema for incremental sync
// ZodCheckpoint requires non-optional primitive types (string, number, boolean)
const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

const sync = createSync<{ Activity: typeof ActivitySchema }, undefined, typeof CheckpointSchema>({
    description: 'Sync activities from Pipedrive',
    version: '2.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Activity: ActivitySchema
    },

    endpoints: [
        {
            path: '/syncs/activities',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after || '';
        const cursor = checkpoint?.cursor || '';

        // https://developers.pipedrive.com/docs/api/v1/Activities
        // Define pagination config separately for type inference
        const paginateConfig: {
            type: 'cursor';
            cursor_name_in_request: string;
            cursor_path_in_response: string;
            response_path: string;
            limit_name_in_request: string;
            limit: number;
        } = {
            type: 'cursor',
            cursor_name_in_request: 'cursor',
            cursor_path_in_response: 'additional_data.next_cursor',
            response_path: 'data',
            limit_name_in_request: 'limit',
            limit: 100
        };

        const proxyConfig = {
            endpoint: '/v1/activities',
            params: {
                sort_by: 'update_time',
                sort_direction: 'asc',
                limit: '100',
                ...(updatedAfter && { updated_since: updatedAfter }),
                ...(cursor && { cursor })
            },
            paginate: paginateConfig,
            retries: 3
        };

        let lastProcessedUpdatedAt: string | undefined;

        for await (const page of nango.paginate<PipedriveActivity>(proxyConfig)) {
            const activities = page
                .filter((record) => record.id !== undefined)
                .map((record) => {
                    // Track the last update_time for checkpointing
                    if (record.update_time) {
                        if (!lastProcessedUpdatedAt || record.update_time > lastProcessedUpdatedAt) {
                            lastProcessedUpdatedAt = record.update_time;
                        }
                    }

                    return {
                        id: String(record.id),
                        ...(record.subject != null && { subject: record.subject }),
                        ...(record.type != null && { type: record.type }),
                        ...(record.done != null && { done: record.done }),
                        ...(record.due_date != null && { due_date: record.due_date }),
                        ...(record.due_time != null && { due_time: record.due_time }),
                        ...(record.duration != null && { duration: record.duration }),
                        ...(record.add_time != null && { add_time: record.add_time }),
                        ...(record.update_time != null && { update_time: record.update_time }),
                        ...(record.user_id != null && { user_id: record.user_id }),
                        ...(record.deal_id != null && { deal_id: record.deal_id }),
                        ...(record.person_id != null && { person_id: record.person_id }),
                        ...(record.org_id != null && { org_id: record.org_id }),
                        ...(record.lead_id != null && { lead_id: record.lead_id }),
                        ...(record.note != null && { note: record.note }),
                        ...(record.active_flag != null && { active_flag: record.active_flag }),
                        ...(record.public_description != null && { public_description: record.public_description }),
                        ...(record.busy_flag != null && { busy_flag: record.busy_flag }),
                        ...(record.marked_as_done_time != null && { marked_as_done_time: record.marked_as_done_time }),
                        ...(record.created_by_user_id != null && { created_by_user_id: record.created_by_user_id }),
                        ...(record.assigned_to_user_id != null && { assigned_to_user_id: record.assigned_to_user_id })
                    };
                });

            if (activities.length === 0) {
                continue;
            }

            await nango.batchSave(activities, 'Activity');

            // Save checkpoint with updated_after and cursor
            if (lastProcessedUpdatedAt) {
                await nango.saveCheckpoint({
                    updated_after: lastProcessedUpdatedAt,
                    cursor: ''
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
