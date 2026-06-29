import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    time_entry_id: z.string().describe('Time entry ID. Example: "343714461"')
});

const MetadataSchema = z.object({
    businessId: z.union([z.string(), z.number()]).describe('Business ID from connection metadata. Example: 14719708')
});

const TimeEntrySchema = z
    .object({
        id: z.number(),
        identity_id: z.number(),
        is_logged: z.boolean(),
        local_started_at: z.string(),
        local_timezone: z.string(),
        started_at: z.string(),
        created_at: z.string(),
        client_id: z.number().nullable().optional(),
        project_id: z.number().nullable().optional(),
        pending_client: z.unknown().nullable().optional(),
        pending_project: z.unknown().nullable().optional(),
        pending_task: z.unknown().nullable().optional(),
        task_id: z.number().nullable().optional(),
        service_id: z.number().nullable().optional(),
        note: z.string().nullable().optional(),
        active: z.boolean(),
        billable: z.boolean(),
        billed: z.boolean(),
        internal: z.boolean(),
        retainer_id: z.number().nullable().optional(),
        duration: z.number(),
        timer: z.unknown().nullable().optional()
    })
    .passthrough();

const OutputSchema = TimeEntrySchema;

const ProviderResponseSchema = z
    .object({
        time_entry: TimeEntrySchema
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single time entry.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['user:time_entries:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const rawMetadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(rawMetadata);

        if (!parsedMetadata.success || !parsedMetadata.data.businessId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'businessId is required in connection metadata.'
            });
        }

        const businessId = String(parsedMetadata.data.businessId);

        const response = await nango.get({
            // https://www.freshbooks.com/api
            endpoint: `/timetracking/business/${encodeURIComponent(businessId)}/time_entries/${encodeURIComponent(input.time_entry_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Time entry not found.',
                time_entry_id: input.time_entry_id
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        return providerResponse.time_entry;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
