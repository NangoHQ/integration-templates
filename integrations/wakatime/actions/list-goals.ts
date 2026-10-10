import { z } from 'zod';
import { createAction } from 'nango';

const GoalChartRangeSchema = z.object({
    date: z.string().optional().describe('Current range as a YYYY-MM-DD date. Only present when the goal delta is "day".'),
    end: z.string().optional().describe('End of the range as an ISO 8601 UTC datetime.'),
    start: z.string().optional().describe('Start of the range as an ISO 8601 UTC datetime.'),
    text: z.string().optional().describe('Human-readable label for the range, relative to the current day.'),
    timezone: z.string().optional().describe('Timezone used for the range in Olson Country/Region format.')
});

const GoalChartDataSchema = z.object({
    actual_seconds: z.number().optional().describe('Seconds coded during this delta period.'),
    actual_seconds_text: z.string().optional().describe('Human-readable time coded during this delta period.'),
    goal_seconds: z.number().optional().describe('Seconds required to meet the goal for this delta period.'),
    goal_seconds_text: z.string().optional().describe('Human-readable time required to meet the goal for this delta period.'),
    range: GoalChartRangeSchema.optional().describe('Time range this chart data point covers.'),
    range_status: z.string().optional().describe('Status of this delta period: "success", "fail", "pending", or "ignored".'),
    range_status_reason: z.string().optional().describe('Explanation for why this delta period passed or failed.')
});

const GoalOwnerSchema = z.object({
    display_name: z.string().optional().describe('Display name taken from full_name or username; defaults to "Anonymous User".'),
    email: z.string().nullable().optional().describe('Email address of the owner; null when the email is not public or not permitted.'),
    full_name: z.string().optional().describe('Full name of the owner.'),
    id: z.string().optional().describe('Unique ID of the owner.'),
    photo: z.string().optional().describe('URL of the owner profile photo.'),
    username: z.string().optional().describe('Public username of the owner.')
});

const GoalSharedWithSchema = z.object({
    display_name: z.string().optional().describe('Display name of the user the goal is shared with.'),
    email: z.string().nullable().optional().describe('Email address, only present when the goal was shared via email; can be null.'),
    full_name: z.string().nullable().optional().describe('Full name of the user the goal is shared with; can be null.'),
    id: z.string().optional().describe('Unique ID of the user the goal is shared with.'),
    photo: z.string().optional().describe('URL of the user profile photo.'),
    status: z.string().optional().describe('Whether the sharing invitation has been accepted.'),
    user_id: z.string().nullable().optional().describe('User ID, only present when the goal was shared via user ID; can be null.'),
    username: z.string().nullable().optional().describe('Username, only present when the goal was shared via username; can be null.')
});

const GoalSubscriberSchema = z.object({
    email: z.string().nullable().optional().describe('Email address of the subscriber, when public; can be null.'),
    email_frequency: z.string().optional().describe('How often the subscriber receives emails about this goal.'),
    full_name: z.string().nullable().optional().describe('Name of the subscriber, when public; can be null.'),
    user_id: z.string().optional().describe('Unique ID of the subscriber.'),
    username: z.string().nullable().optional().describe('Username of the subscriber, when defined; can be null.')
});

const GoalSchema = z.object({
    id: z.string().optional().describe('Unique ID of the goal.'),
    title: z.string().optional().describe('Human-readable title of the goal.'),
    custom_title: z.string().nullable().optional().describe('User-defined title that overrides the default title when set; can be null.'),
    type: z.string().optional().describe('Type of the goal.'),
    delta: z.string().optional().describe('Goal step duration: either "day" or "week".'),
    seconds: z.number().optional().describe('Goal amount in seconds.'),
    range_text: z.string().optional().describe('Complete range of the goal across all delta periods in human-readable format.'),
    status: z.string().optional().describe('Most recent day or week status: "success", "fail", "ignored", or "pending".'),
    cumulative_status: z.string().optional().describe('Status over all delta periods: "success", "fail", or "ignored".'),
    average_status: z.string().optional().describe('"fail" when there are more failure periods than successes, otherwise "success".'),
    status_percent_calculated: z.number().optional().describe('Percent completed until the goal status is fully calculated.'),
    is_enabled: z.boolean().optional().describe('Whether the goal is enabled or disabled.'),
    is_inverse: z.boolean().optional().describe('When true, the goal is to code less rather than more.'),
    is_snoozed: z.boolean().optional().describe('Whether goal email notifications are temporarily disabled.'),
    is_tweeting: z.boolean().optional().describe('Whether this goal tweets progress each day.'),
    is_current_user_owner: z.boolean().optional().describe('Whether the authenticated user owns this goal.'),
    ignore_zero_days: z.boolean().optional().describe('Whether days with no coding activity are ignored.'),
    ignore_days: z.array(z.string()).optional().describe('Weekdays marked "ignored" instead of "failed" when the delta is "day".'),
    improve_by_percent: z.number().nullable().optional().describe('Percent the goal increases each delta period; can be null.'),
    languages: z.array(z.string()).optional().describe('Languages this goal applies to.'),
    editors: z.array(z.string()).optional().describe('Editors this goal applies to.'),
    projects: z.array(z.string()).optional().describe('Projects this goal applies to.'),
    chart_data: z.array(GoalChartDataSchema).optional().describe('Per-period progress entries for the goal.'),
    owner: GoalOwnerSchema.optional().describe('Owner of the goal.'),
    shared_with: z.array(GoalSharedWithSchema).optional().describe('Users the goal is shared with.'),
    subscribers: z.array(GoalSubscriberSchema).optional().describe('Users subscribed to goal notifications.'),
    created_at: z.string().optional().describe('Time the goal was created in ISO 8601 format.'),
    modified_at: z.string().nullable().optional().describe('Time the goal was last changed in ISO 8601 format; can be null.'),
    snooze_until: z.string().nullable().optional().describe('Time goal email notifications resume, in ISO 8601 format; can be null.')
});

const ProviderGoalsResponseSchema = z.object({
    data: z.array(GoalSchema),
    total: z.number().optional(),
    total_pages: z.number().optional()
});

const InputSchema = z.object({}).describe('No input parameters; the current authenticated user is always used.');

const OutputSchema = z
    .object({
        goals: z.array(GoalSchema).describe('The coding goals configured for the current user.'),
        total: z.number().optional().describe('Total number of goals.'),
        total_pages: z.number().optional().describe('Total number of result pages.')
    })
    .describe("The current user's coding goals along with the total goal count and total number of result pages.");

/**
 * @tags: [read]
 * @tagReason: Reads the user's existing coding goals without modifying any provider data.
 * @pitfalls: Goals cannot be created, edited, or deleted by OAuth apps and are managed only in the WakaTime dashboard, so an empty list means the user has no dashboard-configured goals rather than an error.
 */
const action = createAction({
    description: "List the user's coding goals (e.g. daily/weekly time targets per project or language).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_goals'],

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://wakatime.com/developers#goals
            endpoint: '/api/v1/users/current/goals',
            retries: 3
        });

        const parsed = ProviderGoalsResponseSchema.parse(response.data);

        return {
            goals: parsed.data,
            ...(parsed.total !== undefined && { total: parsed.total }),
            ...(parsed.total_pages !== undefined && { total_pages: parsed.total_pages })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
