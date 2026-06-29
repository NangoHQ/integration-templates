import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    businessId: z.string().optional().describe('FreshBooks business ID. Example: "14719708"'),
    business_id: z.string().optional().describe('FreshBooks business ID in snake_case. Example: "14719708"')
});

const InputSchema = z.object({
    id: z.number().describe('Time entry ID. Example: 343714461'),
    note: z.string().optional().describe('Updated note for the time entry'),
    duration: z.number().optional().describe('Duration in seconds'),
    started_at: z.string().optional().describe('Start time in ISO 8601 format. Example: "2026-06-29T10:00:00.000Z"'),
    client_id: z.number().optional().describe('Client ID associated with the time entry'),
    project_id: z.number().optional().describe('Project ID associated with the time entry'),
    is_logged: z.boolean().optional().describe('Whether the time entry is logged'),
    billable: z.boolean().optional().describe('Whether the time entry is billable'),
    service_id: z.number().optional().describe('Service ID associated with the time entry'),
    task_id: z.number().optional().describe('Task ID associated with the time entry')
});

const ProviderTimerSchema = z
    .object({
        id: z.number(),
        is_running: z.boolean().optional()
    })
    .nullable()
    .optional();

const ProviderTimeEntrySchema = z.object({
    id: z.number(),
    identity_id: z.number().optional(),
    is_logged: z.boolean().optional(),
    local_started_at: z.string().optional(),
    local_timezone: z.string().optional(),
    started_at: z.string().optional(),
    created_at: z.string().optional(),
    client_id: z.number().nullable().optional(),
    project_id: z.number().nullable().optional(),
    pending_client: z.string().nullable().optional(),
    pending_project: z.string().nullable().optional(),
    pending_task: z.string().nullable().optional(),
    task_id: z.number().nullable().optional(),
    service_id: z.number().nullable().optional(),
    note: z.string().nullable().optional(),
    active: z.boolean().optional(),
    billable: z.boolean().optional(),
    billed: z.boolean().optional(),
    internal: z.boolean().optional(),
    retainer_id: z.number().nullable().optional(),
    duration: z.number().nullable().optional(),
    timer: ProviderTimerSchema
});

const OutputSchema = z.object({
    id: z.number(),
    note: z.string().optional(),
    duration: z.number().optional(),
    started_at: z.string().optional(),
    client_id: z.number().optional(),
    project_id: z.number().optional(),
    is_logged: z.boolean().optional(),
    billable: z.boolean().optional(),
    billed: z.boolean().optional(),
    active: z.boolean().optional(),
    timer: z
        .object({
            id: z.number().optional(),
            is_running: z.boolean().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Update a time entry.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['user:time_entries:write'],

    exec: async (nango, input) => {
        let rawMetadata: unknown = await nango.getMetadata();
        if (typeof rawMetadata !== 'object' || rawMetadata === null || (!('businessId' in rawMetadata) && !('business_id' in rawMetadata))) {
            const connection = await nango.getConnection();
            rawMetadata = connection.metadata ?? {};
        }
        const metadata = MetadataSchema.parse(rawMetadata);
        const businessId = metadata.businessId || metadata.business_id;

        if (!businessId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'businessId is required in connection metadata.'
            });
        }

        const getResponse = await nango.get({
            // https://www.freshbooks.com/api/time_entries
            endpoint: `/timetracking/business/${encodeURIComponent(String(businessId))}/time_entries/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        const existingEntry = ProviderTimeEntrySchema.parse(getResponse.data?.time_entry);

        const timeEntryPayload = {
            is_logged: input.is_logged !== undefined ? input.is_logged : (existingEntry.is_logged ?? true),
            duration: input.duration !== undefined ? input.duration : (existingEntry.duration ?? 0),
            started_at: input.started_at !== undefined ? input.started_at : (existingEntry.started_at ?? ''),
            ...(input.note !== undefined && { note: input.note }),
            ...(input.client_id !== undefined && { client_id: input.client_id }),
            ...(input.project_id !== undefined && { project_id: input.project_id }),
            ...(input.billable !== undefined && { billable: input.billable }),
            ...(input.service_id !== undefined && { service_id: input.service_id }),
            ...(input.task_id !== undefined && { task_id: input.task_id }),
            ...(existingEntry.timer != null && { timer: { id: existingEntry.timer.id } })
        };

        const response = await nango.put({
            // https://www.freshbooks.com/api/time_entries
            endpoint: `/timetracking/business/${encodeURIComponent(String(businessId))}/time_entries/${encodeURIComponent(String(input.id))}`,
            data: {
                time_entry: timeEntryPayload
            },
            retries: 3
        });

        const providerTimeEntry = ProviderTimeEntrySchema.parse(response.data?.time_entry);

        return {
            id: providerTimeEntry.id,
            ...(providerTimeEntry.note != null && { note: providerTimeEntry.note }),
            ...(providerTimeEntry.duration != null && { duration: providerTimeEntry.duration }),
            ...(providerTimeEntry.started_at !== undefined && { started_at: providerTimeEntry.started_at }),
            ...(providerTimeEntry.client_id != null && { client_id: providerTimeEntry.client_id }),
            ...(providerTimeEntry.project_id != null && { project_id: providerTimeEntry.project_id }),
            ...(providerTimeEntry.is_logged !== undefined && { is_logged: providerTimeEntry.is_logged }),
            ...(providerTimeEntry.billable !== undefined && { billable: providerTimeEntry.billable }),
            ...(providerTimeEntry.billed !== undefined && { billed: providerTimeEntry.billed }),
            ...(providerTimeEntry.active !== undefined && { active: providerTimeEntry.active }),
            ...(providerTimeEntry.timer != null && {
                timer: {
                    id: providerTimeEntry.timer.id,
                    ...(providerTimeEntry.timer.is_running !== undefined && { is_running: providerTimeEntry.timer.is_running })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
