import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        activity_id: z
            .string()
            .describe(
                'ID of the asynchronous activity job to look up. Returned as `activity_id` by bulk-operation endpoints such as delete-tag or delete-contact-list. Example: "9390ec42-bc34-11f1-94f6-02420a320002"'
            )
    })
    .describe('Input for getting the status of an asynchronous activity job');

const ActivityStatusSchema = z
    .record(z.string(), z.number())
    .describe(
        'Job progress counters, keyed by counter name. Common keys include items_total_count and items_completed_count; bulk contact import/export and delete jobs may also report person_count, error_count, correctable_count, cannot_add_to_list_count, and list_count. Which keys are present depends on the job type.'
    );

const OutputSchema = z
    .object({
        activity_id: z.string().describe('Unique ID of the activity job.'),
        state: z
            .string()
            .describe(
                'Current state of the activity. Confirmed values include "initialized" and "completed"; the job is finished once it reaches a terminal state such as "completed".'
            ),
        percent_done: z.number().optional().describe('Progress of the activity as a percentage from 0 to 100.'),
        status: ActivityStatusSchema.optional(),
        activity_errors: z
            .array(z.string())
            .optional()
            .describe('Error messages reported by the activity, one string per error condition. Empty when the job has not reported errors.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the activity was created.'),
        started_at: z.string().optional().describe('ISO 8601 timestamp when the activity started processing. Absent until the job starts.'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp when the activity was last updated.'),
        completed_at: z.string().optional().describe('ISO 8601 timestamp when the activity finished. Absent until the job completes.')
    })
    .describe('Status details of an asynchronous Constant Contact activity job');

const ProviderActivitySchema = z.object({
    activity_id: z.string(),
    state: z.string(),
    percent_done: z.number().optional(),
    status: ActivityStatusSchema.optional(),
    activity_errors: z.array(z.string()).optional(),
    created_at: z.string().optional(),
    started_at: z.string().optional(),
    updated_at: z.string().optional(),
    completed_at: z.string().optional()
});

/**
 * @tags: [read]
 * @tagReason: Only polls the provider for the status of an existing asynchronous activity job; performs no mutations.
 * @pitfalls: Poll state rather than timestamps: started_at and completed_at are absent until the job reaches those stages, and a fast job may already be completed on the first poll. The status object can be empty for a freshly created job.
 */
const action = createAction({
    description: 'Get the status of an asynchronous bulk-operation activity (e.g. a delete-tag or delete-contact-list job).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Docs: https://v3.developer.constantcontact.com/api_reference/index.html (Activities: GET /v3/activities/{activity_id})
        const response = await nango.get({
            endpoint: `/v3/activities/${encodeURIComponent(input.activity_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Activity not found',
                activity_id: input.activity_id
            });
        }

        return ProviderActivitySchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
