import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const GoalOwnerSchema = z
    .object({
        id: z.string().describe('Unique identifier of the goal owner.'),
        username: z.string().optional().describe('Public username of the goal owner.'),
        email: z.string().optional().describe('Email address of the goal owner.'),
        full_name: z.string().optional().describe('Full name of the goal owner.'),
        display_name: z.string().optional().describe('Display name of the goal owner, taken from full_name or username.'),
        photo: z.string().optional().describe('URL of the goal owner profile photo.')
    })
    .describe('WakaTime user who owns a goal.');

const GoalChartDataRangeSchema = z
    .object({
        date: z.string().optional().describe('Current range date in YEAR-MONTH-DAY format; only present when the goal delta is "day".'),
        start: z.string().optional().describe('Start of the current range as an ISO 8601 UTC datetime.'),
        end: z.string().optional().describe('End of the current range as an ISO 8601 UTC datetime.'),
        text: z.string().optional().describe('Human-readable description of the current range relative to today.'),
        timezone: z.string().optional().describe('Timezone used for the range in Olson Country/Region format.')
    })
    .describe('Time range covered by a goal chart data point.');

const GoalChartDataSchema = z
    .object({
        actual_seconds: z.number().optional().describe('Number of seconds coded during this delta period.'),
        actual_seconds_text: z.string().optional().describe('Human-readable time coded during this delta period.'),
        goal_seconds: z.number().optional().describe('Number of seconds required to meet the goal for this delta period.'),
        goal_seconds_text: z.string().optional().describe('Human-readable coding time required to meet the goal for this delta period.'),
        range: GoalChartDataRangeSchema.optional().describe('Time range this data point covers.'),
        range_status: z.string().optional().describe('Status for this delta period: success, fail, pending, or ignored.'),
        range_status_reason: z.string().optional().describe('Explanation of why this delta period passed or failed.')
    })
    .describe('Per-period progress data point for a goal.');

const GoalSharedWithSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier of the user the goal is shared with.'),
        user_id: z.string().optional().describe('User id, present only when the goal was shared by user id.'),
        username: z.string().optional().describe('Username, present only when the goal was shared by username.'),
        email: z.string().optional().describe('Email address, present only when the goal was shared by email.'),
        full_name: z.string().optional().describe('Full name of the user the goal is shared with.'),
        display_name: z.string().optional().describe('Display name of the user the goal is shared with.'),
        photo: z.string().optional().describe('URL of the shared user profile photo.'),
        status: z.string().optional().describe('Whether the share invitation has been accepted by the other user.')
    })
    .describe('User a goal has been shared with.');

const GoalSubscriberSchema = z
    .object({
        user_id: z.string().optional().describe('Unique identifier of the subscriber.'),
        username: z.string().optional().describe('Username of the subscriber, if defined.'),
        email: z.string().optional().describe('Email address of the subscriber, if public.'),
        full_name: z.string().optional().describe('Full name of the subscriber, if public.'),
        email_frequency: z.string().optional().describe('How often the subscriber receives email updates about the goal.')
    })
    .describe('User subscribed to email updates for a goal.');

const GoalSchema = z
    .object({
        id: z.string().describe('Unique identifier of the goal.'),
        type: z.string().optional().describe('Type of the goal.'),
        title: z.string().optional().describe('Human-readable title of the goal.'),
        custom_title: z.string().optional().describe('User-defined title that overrides title when set.'),
        delta: z.string().optional().describe('Goal step duration: either "day" or "week".'),
        seconds: z.number().optional().describe('Goal amount in seconds.'),
        range_text: z.string().optional().describe('Complete range of the goal across all delta periods, in human-readable form.'),
        status: z.string().optional().describe('Status of the most recent day or week: success, fail, ignored, or pending.'),
        cumulative_status: z.string().optional().describe('Status over all delta periods: success, fail, or ignored.'),
        average_status: z.string().optional().describe('"fail" when there are more failure days or weeks than success, otherwise "success".'),
        status_percent_calculated: z
            .number()
            .optional()
            .describe('Percent of the background pre-calculation completed before the goal status becomes available.'),
        is_enabled: z.boolean().optional().describe('Whether the goal is enabled.'),
        is_inverse: z.boolean().optional().describe('When true, the goal is to code less rather than more.'),
        is_current_user_owner: z.boolean().optional().describe('Whether the currently authenticated user owns the goal.'),
        is_snoozed: z.boolean().optional().describe('Whether goal email notifications are temporarily disabled.'),
        is_tweeting: z.boolean().optional().describe('Whether the goal is set up to tweet progress each day.'),
        ignore_zero_days: z.boolean().optional().describe('Whether days with no coding activity are ignored.'),
        ignore_days: z.array(z.string()).optional().describe('Weekdays whose status is set to "ignored" when the delta is "day".'),
        improve_by_percent: z.number().optional().describe('Percent the goal should increase each delta.'),
        editors: z.array(z.string()).optional().describe('Editors tracked by the goal.'),
        languages: z.array(z.string()).optional().describe('Languages tracked by the goal.'),
        projects: z.array(z.string()).optional().describe('Projects tracked by the goal.'),
        created_at: z.string().optional().describe('Time the goal was created as an ISO 8601 datetime.'),
        modified_at: z.string().optional().describe('Time the goal was last changed as an ISO 8601 datetime.'),
        snooze_until: z.string().optional().describe('Time goal email notifications will be re-enabled as an ISO 8601 datetime.'),
        owner: GoalOwnerSchema.optional().describe('User who owns the goal.'),
        shared_with: z.array(GoalSharedWithSchema).optional().describe('Users the goal is shared with.'),
        subscribers: z.array(GoalSubscriberSchema).optional().describe('Users subscribed to email updates for the goal.'),
        chart_data: z.array(GoalChartDataSchema).optional().describe('Per-period progress data points for the goal.')
    })
    .describe('A WakaTime coding goal configured by the user.');

const GoalsResponseSchema = z.object({
    data: z.array(GoalSchema),
    total: z.number().optional(),
    total_pages: z.number().optional()
});

// WakaTime sends null for unset fields (e.g. custom_title, owner.username), while the Goal model
// represents them as omitted, so drop null-valued keys at every level before validating.
function stripNulls(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(stripNulls);
    }
    if (typeof value === 'object' && value !== null) {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([, entry]) => entry !== null)
                .map(([key, entry]) => [key, stripNulls(entry)])
        );
    }
    return value;
}

const sync = createSync({
    description: "Sync the user's configured coding goals.",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['read_goals'],
    models: {
        Goal: GoalSchema
    },

    exec: async (nango) => {
        // Full refresh: GET /users/current/goals exposes no changed-since filter or cursor, so there is
        // no resumable state to checkpoint. trackDeletesStart/trackDeletesEnd remove goals that were
        // deleted through the WakaTime dashboard between runs. Goal writes are blocked for OAuth
        // connections, so this sync only ever reflects dashboard changes.
        await nango.trackDeletesStart('Goal');

        // The response reports total_pages, so every page is fetched before delete tracking ends;
        // otherwise goals on later pages would be marked as deleted.
        let page = 1;
        let totalPages = 1;
        do {
            const proxyConfig: ProxyConfiguration = {
                // https://wakatime.com/developers#goals
                endpoint: '/api/v1/users/current/goals',
                ...(page > 1 && { params: { page } }),
                retries: 3
            };

            const response = await nango.get<unknown>(proxyConfig);
            const parsed = GoalsResponseSchema.parse(stripNulls(response.data));

            if (parsed.data.length > 0) {
                await nango.batchSave(parsed.data, 'Goal');
            }

            totalPages = parsed.total_pages ?? 1;
            page += 1;
        } while (page <= totalPages);

        await nango.trackDeletesEnd('Goal');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
