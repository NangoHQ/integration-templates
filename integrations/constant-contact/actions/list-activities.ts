import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        limit: z
            .number()
            .int()
            .min(1)
            .max(500)
            .optional()
            .describe('Maximum number of activities to return per page, between 1 and 500. Example: 50. Uses the provider default when omitted.'),
        cursor: z.string().min(1).optional().describe('Pagination cursor from the next_cursor of a previous response. Omit to fetch the first page.')
    })
    .describe('Optional paging controls for listing activity jobs. With no input, the first page is returned using provider defaults.');

const ActivitySchema = z
    .object({
        activity_id: z.string().describe('Unique identifier of the activity job. Example: "a7f4ce74-bc34-11f1-842a-02420a320002"'),
        state: z.string().describe('Current state of the job. Known values: "initialized", "processing", "completed", "cancelled", "failed", "timed_out".'),
        percent_done: z.number().optional().describe('Completion percentage of the job, from 0 to 100.'),
        created_at: z.string().optional().describe('ISO-8601 timestamp when the job was created. Example: "2026-09-29T18:36:16Z"'),
        started_at: z.string().optional().describe('ISO-8601 timestamp when the job started processing.'),
        completed_at: z.string().optional().describe('ISO-8601 timestamp when the job reached a terminal state. Absent while the job is still running.'),
        updated_at: z.string().optional().describe('ISO-8601 timestamp of the last update to the job.'),
        status: z
            .record(z.string(), z.number())
            .optional()
            .describe('Job-specific progress counters such as items_total_count, items_completed_count, or list_count. Keys vary by activity type.'),
        activity_errors: z
            .array(z.string())
            .optional()
            .describe('Error messages reported by the job, one string per error condition; empty when the job finished without errors.')
    })
    .describe('A single asynchronous bulk-operation activity job.');

const OutputSchema = z
    .object({
        activities: z.array(ActivitySchema).describe('Recent asynchronous bulk-operation activity jobs on the account, most recent first.'),
        next_cursor: z.string().optional().describe('Cursor to pass as cursor to fetch the next page. Absent when there are no more activities.')
    })
    .describe('One page of recent activity jobs plus the cursor needed to fetch the next page.');

const ProviderActivitySchema = z.object({
    activity_id: z.string(),
    state: z.string(),
    percent_done: z.number().optional(),
    created_at: z.string().optional(),
    started_at: z.string().optional(),
    completed_at: z.string().optional(),
    updated_at: z.string().optional(),
    status: z.record(z.string(), z.number()).optional(),
    activity_errors: z.array(z.string()).optional()
});

const ProviderActivitiesResponseSchema = z.object({
    activities: z.array(ProviderActivitySchema),
    _links: z
        .object({
            next: z
                .object({
                    href: z.string()
                })
                .optional()
        })
        .optional()
});

/**
 * @tags: [read]
 * @tagReason: Only reads the account's activity jobs from the provider; it does not create, modify, or delete anything.
 * @pitfalls: Only asynchronous bulk-operation jobs (such as bulk imports or tag and contact-list deletions) appear here; synchronous API operations never produce activity entries.
 */
const action = createAction({
    description: 'List recent asynchronous bulk-operation activities on the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html — GET /v3/activities
            endpoint: '/v3/activities',
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = ProviderActivitiesResponseSchema.parse(response.data);

        const activities = parsed.activities.map((activity) => ({
            activity_id: activity.activity_id,
            state: activity.state,
            ...(activity.percent_done !== undefined && { percent_done: activity.percent_done }),
            ...(activity.created_at !== undefined && { created_at: activity.created_at }),
            ...(activity.started_at !== undefined && { started_at: activity.started_at }),
            ...(activity.completed_at !== undefined && { completed_at: activity.completed_at }),
            ...(activity.updated_at !== undefined && { updated_at: activity.updated_at }),
            ...(activity.status !== undefined && { status: activity.status }),
            ...(activity.activity_errors !== undefined && { activity_errors: activity.activity_errors })
        }));

        let nextCursor: string | undefined;
        const nextHref = parsed._links?.next?.href;
        if (nextHref) {
            const queryStart = nextHref.indexOf('?');
            if (queryStart >= 0) {
                const cursorParam = nextHref
                    .slice(queryStart + 1)
                    .split('&')
                    .find((param) => param.startsWith('cursor='));
                if (cursorParam) {
                    nextCursor = decodeURIComponent(cursorParam.slice('cursor='.length));
                }
            }
        }

        return {
            activities,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
