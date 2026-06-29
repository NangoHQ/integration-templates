import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    businessId: z.union([z.number(), z.string()]).optional(),
    accountId: z.string().optional()
});

const UserMeSchema = z.object({
    response: z.object({
        business_memberships: z
            .array(
                z.object({
                    business: z.object({
                        account_id: z.string(),
                        id: z.union([z.number(), z.string()])
                    })
                })
            )
            .optional()
    })
});

const InputSchema = z.object({
    is_logged: z.boolean().describe('Whether the time entry is logged.'),
    started_at: z.string().describe('ISO 8601 timestamp when the work started. Example: "2024-01-01T10:00:00Z"'),
    duration: z.number().describe('Duration of the time entry in seconds. Example: 3600'),
    client_id: z.union([z.number(), z.string()]).describe('Client ID associated with the time entry. Example: 567521'),
    identity_id: z.union([z.number(), z.string()]).optional().describe('Identity ID of the teammate logging the time.'),
    project_id: z.union([z.number(), z.string()]).optional().describe('Project ID associated with the time entry.'),
    service_id: z.union([z.number(), z.string()]).optional().describe('Service ID associated with the time entry.'),
    task_id: z.union([z.number(), z.string()]).optional().describe('Task ID associated with the time entry.'),
    note: z.string().optional().describe('Note describing the work.'),
    billable: z.boolean().optional().describe('Whether the entry can be added to an invoice.'),
    billed: z.boolean().optional().describe('Whether the entry has already been billed.'),
    internal: z.boolean().optional().describe('Whether the time entry is internal (not assigned to a client).')
});

const ProviderTimeEntrySchema = z.object({
    id: z.union([z.number(), z.string()]),
    identity_id: z.union([z.number(), z.string()]).nullable().optional(),
    is_logged: z.boolean(),
    local_started_at: z.string().nullable().optional(),
    local_timezone: z.string().nullable().optional(),
    started_at: z.string(),
    created_at: z.string().nullable().optional(),
    client_id: z.union([z.number(), z.string()]).nullable().optional(),
    project_id: z.union([z.number(), z.string()]).nullable().optional(),
    pending_client: z.unknown().nullable().optional(),
    pending_project: z.unknown().nullable().optional(),
    pending_task: z.unknown().nullable().optional(),
    task_id: z.union([z.number(), z.string()]).nullable().optional(),
    service_id: z.union([z.number(), z.string()]).nullable().optional(),
    note: z.string().nullable().optional(),
    active: z.boolean().nullable().optional(),
    billable: z.boolean().nullable().optional(),
    billed: z.boolean().nullable().optional(),
    internal: z.boolean().nullable().optional(),
    retainer_id: z.union([z.number(), z.string()]).nullable().optional(),
    duration: z.number().nullable().optional(),
    timer: z.unknown().nullable().optional()
});

const ProviderResponseSchema = z.object({
    time_entry: ProviderTimeEntrySchema
});

const OutputSchema = z.object({
    id: z.union([z.number(), z.string()]),
    identity_id: z.union([z.number(), z.string()]).optional(),
    is_logged: z.boolean(),
    started_at: z.string(),
    created_at: z.string().optional(),
    client_id: z.union([z.number(), z.string()]).optional(),
    project_id: z.union([z.number(), z.string()]).optional(),
    task_id: z.union([z.number(), z.string()]).optional(),
    service_id: z.union([z.number(), z.string()]).optional(),
    note: z.string().optional(),
    active: z.boolean().optional(),
    billable: z.boolean().optional(),
    billed: z.boolean().optional(),
    internal: z.boolean().optional(),
    duration: z.number().optional(),
    timer: z.unknown().optional()
});

const action = createAction({
    description: 'Create a time entry.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user:time_entries:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.safeParse(rawMetadata);

        let businessId: string | number | undefined;
        if (metadata.success && metadata.data.businessId !== undefined) {
            businessId = metadata.data.businessId;
        }

        if (!businessId) {
            // https://www.freshbooks.com/api/identity
            const userResponse = await nango.get({
                endpoint: '/auth/api/v1/users/me',
                retries: 3
            });

            const userData = UserMeSchema.parse(userResponse.data);
            const fetchedBusinessId = userData.response.business_memberships?.[0]?.business?.id;
            if (!fetchedBusinessId) {
                throw new nango.ActionError({
                    type: 'missing_business_id',
                    message: 'business_id is required in metadata or must be available from the identity endpoint.'
                });
            }
            businessId = fetchedBusinessId;
        }

        const timeEntryPayload: {
            is_logged: boolean;
            started_at: string;
            duration: number;
            client_id: number | string;
            identity_id?: number | string;
            project_id?: number | string;
            service_id?: number | string;
            task_id?: number | string;
            note?: string;
            billable?: boolean;
            billed?: boolean;
            internal?: boolean;
        } = {
            is_logged: input.is_logged,
            started_at: input.started_at,
            duration: input.duration,
            client_id: input.client_id
        };

        if (input.identity_id !== undefined) {
            timeEntryPayload.identity_id = input.identity_id;
        }
        if (input.project_id !== undefined) {
            timeEntryPayload.project_id = input.project_id;
        }
        if (input.service_id !== undefined) {
            timeEntryPayload.service_id = input.service_id;
        }
        if (input.task_id !== undefined) {
            timeEntryPayload.task_id = input.task_id;
        }
        if (input.note !== undefined) {
            timeEntryPayload.note = input.note;
        }
        if (input.billable !== undefined) {
            timeEntryPayload.billable = input.billable;
        }
        if (input.billed !== undefined) {
            timeEntryPayload.billed = input.billed;
        }
        if (input.internal !== undefined) {
            timeEntryPayload.internal = input.internal;
        }

        // https://www.freshbooks.com/api/time_entries
        const response = await nango.post({
            endpoint: `/timetracking/business/${encodeURIComponent(String(businessId))}/time_entries`,
            data: {
                time_entry: timeEntryPayload
            },
            headers: {
                'Content-Type': 'application/json'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const entry = providerResponse.time_entry;

        return {
            id: entry.id,
            is_logged: entry.is_logged,
            started_at: entry.started_at,
            ...(entry.identity_id != null && { identity_id: entry.identity_id }),
            ...(entry.created_at != null && { created_at: entry.created_at }),
            ...(entry.client_id != null && { client_id: entry.client_id }),
            ...(entry.project_id != null && { project_id: entry.project_id }),
            ...(entry.task_id != null && { task_id: entry.task_id }),
            ...(entry.service_id != null && { service_id: entry.service_id }),
            ...(entry.note != null && { note: entry.note }),
            ...(entry.active != null && { active: entry.active }),
            ...(entry.billable != null && { billable: entry.billable }),
            ...(entry.billed != null && { billed: entry.billed }),
            ...(entry.internal != null && { internal: entry.internal }),
            ...(entry.duration != null && { duration: entry.duration }),
            ...(entry.timer != null && { timer: entry.timer })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
