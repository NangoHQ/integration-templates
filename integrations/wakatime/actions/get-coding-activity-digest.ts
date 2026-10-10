import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        range: z
            .string()
            .regex(/^(last_7_days|last_30_days|last_6_months|last_year|all_time|\d{4}(-\d{2})?)$/)
            .optional()
            .describe(
                "Stats range to summarize. One of 'last_7_days', 'last_30_days', 'last_6_months', 'last_year', 'all_time', a year like '2026', or a month like '2026-10'. Defaults to 'last_7_days'."
            ),
        date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe("Day to list heartbeats for, in the user's timezone, formatted as YYYY-MM-DD. Defaults to today in the user's timezone.")
    })
    .describe('Input for the coding activity digest: which stats range and heartbeat day to include.');

const ProviderUserSchema = z.object({
    id: z.string(),
    email: z.string().nullable().optional(),
    display_name: z.string().nullable().optional(),
    full_name: z.string().nullable().optional(),
    username: z.string().nullable().optional(),
    timezone: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    photo: z.string().nullable().optional(),
    profile_url: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    is_email_confirmed: z.boolean().nullable().optional(),
    last_heartbeat_at: z.string().nullable().optional(),
    last_project: z.string().nullable().optional(),
    last_language: z.string().nullable().optional()
});

const ProviderBreakdownSchema = z.object({
    name: z.string(),
    total_seconds: z.number().nullable().optional(),
    percent: z.number().nullable().optional(),
    text: z.string().nullable().optional()
});

const ProviderBestDaySchema = z.object({
    date: z.string().nullable().optional(),
    text: z.string().nullable().optional(),
    total_seconds: z.number().nullable().optional()
});

const ProviderStatsSchema = z.object({
    range: z.string().nullable().optional(),
    human_readable_range: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    percent_calculated: z.number().nullable().optional(),
    is_up_to_date: z.boolean().nullable().optional(),
    is_including_today: z.boolean().nullable().optional(),
    message: z.string().nullable().optional(),
    total_seconds: z.number().nullable().optional(),
    human_readable_total: z.string().nullable().optional(),
    daily_average: z.number().nullable().optional(),
    human_readable_daily_average: z.string().nullable().optional(),
    best_day: ProviderBestDaySchema.nullable().optional(),
    categories: z.array(ProviderBreakdownSchema).nullable().optional(),
    languages: z.array(ProviderBreakdownSchema).nullable().optional(),
    editors: z.array(ProviderBreakdownSchema).nullable().optional(),
    projects: z.array(ProviderBreakdownSchema).nullable().optional(),
    operating_systems: z.array(ProviderBreakdownSchema).nullable().optional(),
    dependencies: z.array(ProviderBreakdownSchema).nullable().optional(),
    machines: z.array(ProviderBreakdownSchema).nullable().optional()
});

const ProviderHeartbeatSchema = z.object({
    entity: z.string(),
    type: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    time: z.number(),
    project: z.string().nullable().optional(),
    branch: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    dependencies: z
        .union([z.string(), z.array(z.string())])
        .nullable()
        .optional(),
    machine_name_id: z.string().nullable().optional(),
    is_write: z.boolean().nullable().optional(),
    lines: z.number().nullable().optional(),
    lineno: z.number().nullable().optional(),
    cursorpos: z.number().nullable().optional()
});

const ProviderGoalSchema = z.object({
    id: z.string(),
    title: z.string().nullable().optional(),
    custom_title: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    delta: z.string().nullable().optional(),
    seconds: z.number().nullable().optional(),
    status: z.string().nullable().optional(),
    cumulative_status: z.string().nullable().optional(),
    average_status: z.string().nullable().optional(),
    is_enabled: z.boolean().nullable().optional(),
    is_snoozed: z.boolean().nullable().optional(),
    is_inverse: z.boolean().nullable().optional(),
    ignore_zero_days: z.boolean().nullable().optional(),
    range_text: z.string().nullable().optional(),
    languages: z.array(z.string()).nullable().optional(),
    projects: z.array(z.string()).nullable().optional(),
    editors: z.array(z.string()).nullable().optional(),
    created_at: z.string().nullable().optional(),
    modified_at: z.string().nullable().optional()
});

const ProviderAllTimeSchema = z.object({
    total_seconds: z.number().nullable().optional(),
    text: z.string().nullable().optional(),
    decimal: z.string().nullable().optional(),
    digital: z.string().nullable().optional(),
    daily_average: z.number().nullable().optional(),
    is_up_to_date: z.boolean().nullable().optional(),
    percent_calculated: z.number().nullable().optional(),
    message: z.string().nullable().optional()
});

const ProfileOutputSchema = z.object({
    id: z.string().describe('Unique WakaTime user id.'),
    email: z.string().optional().describe("User's email address; present only when the connection granted the email scope."),
    display_name: z.string().optional().describe('Display name shown on the WakaTime profile.'),
    full_name: z.string().optional().describe("User's full name, when set."),
    username: z.string().optional().describe("User's public WakaTime username, when set."),
    timezone: z.string().optional().describe("User's timezone in Olson Country/Region format, e.g. 'America/New_York'."),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the WakaTime account was created.'),
    photo: z.string().optional().describe('URL of the user profile photo.'),
    profile_url: z.string().optional().describe('URL of the public WakaTime profile.'),
    website: z.string().optional().describe("User's website URL, when set."),
    location: z.string().optional().describe("User's location, when set."),
    is_email_confirmed: z.boolean().optional().describe("Whether the user's email address has been confirmed."),
    last_heartbeat_at: z.string().optional().describe('ISO 8601 timestamp of the most recent heartbeat, when any exists.'),
    last_project: z.string().optional().describe('Name of the most recently used project, when any exists.'),
    last_language: z.string().optional().describe('Most recently used programming language, when any exists.')
});

const BreakdownOutputSchema = z.object({
    name: z.string().describe('Name of the category, project, language, editor, OS, dependency, or machine.'),
    total_seconds: z.number().optional().describe('Total seconds of coding activity attributed to this item.'),
    percent: z.number().optional().describe('Percentage of total coding activity attributed to this item.'),
    text: z.string().optional().describe('Human-readable total time for this item.')
});

const BestDayOutputSchema = z.object({
    date: z.string().optional().describe('Day with the most coding activity as YYYY-MM-DD.'),
    text: z.string().optional().describe('Human-readable coding time for the best day.'),
    total_seconds: z.number().optional().describe('Seconds of coding activity on the best day.')
});

const StatsOutputSchema = z.object({
    status: z
        .enum(['ready', 'calculating'])
        .describe("'ready' when the range's stats are fully calculated, 'calculating' when WakaTime is still computing them."),
    percent_calculated: z.number().int().describe('Percentage (0-100) of the stats calculation that has completed.'),
    message: z
        .string()
        .optional()
        .describe("Provider explanation shown while stats are still calculating, e.g. 'Calculating stats for this user. Check back later.'."),
    range: z.string().optional().describe('Time range these stats cover, as requested (e.g. last_7_days).'),
    human_readable_range: z.string().optional().describe('Human-readable label for the range, e.g. "last week".'),
    is_up_to_date: z.boolean().optional().describe('Whether the stats are fully up to date.'),
    is_including_today: z.boolean().optional().describe("Whether the stats include the current day's activity."),
    total_seconds: z.number().optional().describe('Total seconds of coding activity in the range.'),
    human_readable_total: z.string().optional().describe('Human-readable total coding time in the range.'),
    daily_average: z.number().optional().describe('Average seconds of coding activity per day in the range.'),
    human_readable_daily_average: z.string().optional().describe('Human-readable average coding time per day in the range.'),
    best_day: BestDayOutputSchema.optional().describe('Day with the most coding activity in the range, when any activity exists.'),
    categories: z.array(BreakdownOutputSchema).optional().describe('Coding activity grouped by category (e.g. Coding, Debugging).'),
    languages: z.array(BreakdownOutputSchema).optional().describe('Coding activity grouped by programming language.'),
    editors: z.array(BreakdownOutputSchema).optional().describe('Coding activity grouped by editor.'),
    projects: z.array(BreakdownOutputSchema).optional().describe('Coding activity grouped by project.'),
    operating_systems: z.array(BreakdownOutputSchema).optional().describe('Coding activity grouped by operating system.'),
    dependencies: z.array(BreakdownOutputSchema).optional().describe('Coding activity grouped by dependency.'),
    machines: z.array(BreakdownOutputSchema).optional().describe('Coding activity grouped by machine.')
});

const HeartbeatOutputSchema = z.object({
    entity: z.string().describe('Entity the heartbeat logs time against, such as an absolute file path or domain.'),
    type: z.string().optional().describe("Entity type, e.g. 'file', 'app', 'url', or 'domain'."),
    category: z.string().optional().describe("Activity category, e.g. 'coding', 'debugging', or 'browsing'."),
    time: z.number().describe('UNIX epoch timestamp of the heartbeat, including fractional seconds.'),
    project: z.string().optional().describe('Project name associated with the heartbeat.'),
    branch: z.string().optional().describe('Version control branch associated with the heartbeat.'),
    language: z.string().optional().describe('Programming language detected for the heartbeat.'),
    dependencies: z.array(z.string()).optional().describe('Dependencies detected for the entity.'),
    machine_name_id: z.string().optional().describe('Unique id of the machine that generated the heartbeat.'),
    is_write: z.boolean().optional().describe('Whether the heartbeat was triggered by writing to a file.'),
    lines: z.number().int().optional().describe('Total number of lines in the entity when it is a file.'),
    lineno: z.number().int().optional().describe('Current cursor line number, when reported.'),
    cursorpos: z.number().int().optional().describe('Current cursor column position, when reported.')
});

const GoalOutputSchema = z.object({
    id: z.string().describe('Unique goal id.'),
    title: z.string().optional().describe('Human-readable title for the goal.'),
    custom_title: z.string().optional().describe('User-defined title that overrides the default goal title, when set.'),
    type: z.string().optional().describe('Type of goal.'),
    delta: z.string().optional().describe("Goal step duration, either 'day' or 'week'."),
    seconds: z.number().int().optional().describe('Target coding time for each delta period, in seconds.'),
    status: z.string().optional().describe("Most recent delta period status, e.g. 'success', 'fail', 'ignored', or 'pending'."),
    cumulative_status: z.string().optional().describe("Status across all delta periods, e.g. 'success', 'fail', or 'ignored'."),
    average_status: z.string().optional().describe("'fail' when there are more failure periods than successes, otherwise 'success'."),
    is_enabled: z.boolean().optional().describe('Whether the goal is enabled.'),
    is_snoozed: z.boolean().optional().describe('Whether goal email notifications are temporarily disabled.'),
    is_inverse: z.boolean().optional().describe('When true, the goal is to code less rather than more.'),
    ignore_zero_days: z.boolean().optional().describe('Whether days with no coding activity are ignored instead of counted as failures.'),
    range_text: z.string().optional().describe('Complete goal range across all delta periods in human-readable form.'),
    languages: z.array(z.string()).optional().describe('Programming languages the goal is limited to, when scoped.'),
    projects: z.array(z.string()).optional().describe('Projects the goal is limited to, when scoped.'),
    editors: z.array(z.string()).optional().describe('Editors the goal is limited to, when scoped.'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the goal was created.'),
    modified_at: z.string().optional().describe('ISO 8601 timestamp when the goal was last modified, when ever modified.')
});

const AllTimeOutputSchema = z.object({
    status: z
        .enum(['ready', 'calculating'])
        .describe("'ready' when the lifetime total is fully calculated, 'calculating' when WakaTime is still computing it."),
    percent_calculated: z.number().int().describe('Percentage (0-100) of the lifetime total calculation that has completed.'),
    message: z.string().optional().describe('Provider explanation shown while the lifetime total is still calculating.'),
    total_seconds: z.number().optional().describe('Total seconds of coding activity since the account was created.'),
    text: z.string().optional().describe('Human-readable total coding time since account creation.'),
    decimal: z.string().optional().describe('Total coding activity in decimal-hours format.'),
    digital: z.string().optional().describe('Total coding activity in digital clock format.'),
    daily_average: z.number().optional().describe('Average seconds of coding activity per day since account creation.'),
    is_up_to_date: z.boolean().optional().describe('Whether the lifetime total is fully up to date.')
});

const OutputSchema = z
    .object({
        date: z.string().describe('Day (YYYY-MM-DD) the heartbeats component covers.'),
        range: z.string().describe('Stats range the recent_stats component covers.'),
        profile: ProfileOutputSchema.describe('Current WakaTime user profile.'),
        recent_stats: StatsOutputSchema.describe('Coding activity for the requested range, or a calculating marker when not yet ready.'),
        todays_heartbeats: z.array(HeartbeatOutputSchema).describe('Heartbeats recorded on the requested day; an empty array means no activity that day.'),
        goals: z.array(GoalOutputSchema).describe('Goals configured for the user; an empty array means no goals configured.'),
        all_time: AllTimeOutputSchema.describe('Lifetime coding total since account creation, or a calculating marker when not yet ready.')
    })
    .describe('Consolidated coding activity digest combining the user profile, recent stats, heartbeats, goals, and lifetime total.');

function resolveToday(timezone: string | undefined): string {
    if (!timezone) {
        return new Date().toISOString().slice(0, 10);
    }
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(new Date());
    const year = parts.find((part) => part.type === 'year')?.value ?? '';
    const month = parts.find((part) => part.type === 'month')?.value ?? '';
    const day = parts.find((part) => part.type === 'day')?.value ?? '';
    return `${year}-${month}-${day}`;
}

function mapBreakdown(item: z.infer<typeof ProviderBreakdownSchema>): z.infer<typeof BreakdownOutputSchema> {
    return {
        name: item.name,
        ...(item.total_seconds != null && { total_seconds: item.total_seconds }),
        ...(item.percent != null && { percent: item.percent }),
        ...(item.text != null && { text: item.text })
    };
}

/**
 * @tags: [read]
 * @tagReason: Reads the user profile, recent stats, heartbeats, goals, and lifetime total from WakaTime without modifying any provider data.
 * @pitfalls: recent_stats and all_time may return status "calculating" with no numeric fields while WakaTime recalculates in the background, so missing numbers there are not zero; empty heartbeats or goals arrays mean no activity or goals configured, and recently recorded heartbeats can take a short while to appear, so an empty today result may be temporary.
 */
const action = createAction({
    description:
        "Get a consolidated view of the user's coding activity: profile, recent stats, today's heartbeats, goals, and lifetime total, flagging any component still being calculated.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['email', 'read_stats', 'read_heartbeats', 'read_goals'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const range = input.range ?? 'last_7_days';

        const userResponse = await nango.get<unknown>({
            // https://wakatime.com/developers#users
            endpoint: '/api/v1/users/current',
            retries: 3
        });
        const userEnvelope = z.object({ data: ProviderUserSchema }).parse(userResponse.data);
        const user = userEnvelope.data;

        const date = input.date ?? resolveToday(user.timezone ?? undefined);

        const statsResponse = await nango.get<unknown>({
            // https://wakatime.com/developers#stats
            endpoint: `/api/v1/users/current/stats/${encodeURIComponent(range)}`,
            retries: 3
        });
        const statsEnvelope = z.object({ data: ProviderStatsSchema }).parse(statsResponse.data);
        const stats = statsEnvelope.data;

        const heartbeatsResponse = await nango.get<unknown>({
            // https://wakatime.com/developers#heartbeats
            endpoint: '/api/v1/users/current/heartbeats',
            params: {
                date
            },
            retries: 3
        });
        const heartbeatsEnvelope = z.object({ data: z.array(ProviderHeartbeatSchema) }).parse(heartbeatsResponse.data);
        const heartbeats = heartbeatsEnvelope.data;

        const goalsResponse = await nango.get<unknown>({
            // https://wakatime.com/developers#goals
            endpoint: '/api/v1/users/current/goals',
            retries: 3
        });
        const goalsEnvelope = z.object({ data: z.array(ProviderGoalSchema) }).parse(goalsResponse.data);
        const goals = goalsEnvelope.data;

        const allTimeResponse = await nango.get<unknown>({
            // https://wakatime.com/developers#all_time_since_today
            endpoint: '/api/v1/users/current/all_time_since_today',
            retries: 3
        });
        const allTimeEnvelope = z.object({ data: ProviderAllTimeSchema }).parse(allTimeResponse.data);
        const allTime = allTimeEnvelope.data;

        const profile: z.infer<typeof ProfileOutputSchema> = {
            id: user.id,
            ...(user.email != null && { email: user.email }),
            ...(user.display_name != null && { display_name: user.display_name }),
            ...(user.full_name != null && { full_name: user.full_name }),
            ...(user.username != null && { username: user.username }),
            ...(user.timezone != null && { timezone: user.timezone }),
            ...(user.created_at != null && { created_at: user.created_at }),
            ...(user.photo != null && { photo: user.photo }),
            ...(user.profile_url != null && { profile_url: user.profile_url }),
            ...(user.website != null && { website: user.website }),
            ...(user.location != null && { location: user.location }),
            ...(user.is_email_confirmed != null && { is_email_confirmed: user.is_email_confirmed }),
            ...(user.last_heartbeat_at != null && { last_heartbeat_at: user.last_heartbeat_at }),
            ...(user.last_project != null && { last_project: user.last_project }),
            ...(user.last_language != null && { last_language: user.last_language })
        };

        const statsPercent = stats.percent_calculated ?? 0;
        const statsReady = stats.is_up_to_date === true && statsPercent === 100;
        const recentStats: z.infer<typeof StatsOutputSchema> = statsReady
            ? {
                  status: 'ready',
                  percent_calculated: statsPercent,
                  ...(stats.range != null && { range: stats.range }),
                  ...(stats.human_readable_range != null && { human_readable_range: stats.human_readable_range }),
                  ...(stats.is_up_to_date != null && { is_up_to_date: stats.is_up_to_date }),
                  ...(stats.is_including_today != null && { is_including_today: stats.is_including_today }),
                  ...(stats.total_seconds != null && { total_seconds: stats.total_seconds }),
                  ...(stats.human_readable_total != null && { human_readable_total: stats.human_readable_total }),
                  ...(stats.daily_average != null && { daily_average: stats.daily_average }),
                  ...(stats.human_readable_daily_average != null && { human_readable_daily_average: stats.human_readable_daily_average }),
                  ...(stats.best_day != null && {
                      best_day: {
                          ...(stats.best_day.date != null && { date: stats.best_day.date }),
                          ...(stats.best_day.text != null && { text: stats.best_day.text }),
                          ...(stats.best_day.total_seconds != null && { total_seconds: stats.best_day.total_seconds })
                      }
                  }),
                  ...(stats.categories != null && { categories: stats.categories.map(mapBreakdown) }),
                  ...(stats.languages != null && { languages: stats.languages.map(mapBreakdown) }),
                  ...(stats.editors != null && { editors: stats.editors.map(mapBreakdown) }),
                  ...(stats.projects != null && { projects: stats.projects.map(mapBreakdown) }),
                  ...(stats.operating_systems != null && { operating_systems: stats.operating_systems.map(mapBreakdown) }),
                  ...(stats.dependencies != null && { dependencies: stats.dependencies.map(mapBreakdown) }),
                  ...(stats.machines != null && { machines: stats.machines.map(mapBreakdown) })
              }
            : {
                  status: 'calculating',
                  percent_calculated: statsPercent,
                  ...(stats.message != null && { message: stats.message }),
                  ...(stats.range != null && { range: stats.range })
              };

        const allTimePercent = allTime.percent_calculated ?? 0;
        const allTimeReady = allTime.is_up_to_date === true && allTimePercent === 100;
        const allTimeOutput: z.infer<typeof AllTimeOutputSchema> = allTimeReady
            ? {
                  status: 'ready',
                  percent_calculated: allTimePercent,
                  ...(allTime.total_seconds != null && { total_seconds: allTime.total_seconds }),
                  ...(allTime.text != null && { text: allTime.text }),
                  ...(allTime.decimal != null && { decimal: allTime.decimal }),
                  ...(allTime.digital != null && { digital: allTime.digital }),
                  ...(allTime.daily_average != null && { daily_average: allTime.daily_average }),
                  ...(allTime.is_up_to_date != null && { is_up_to_date: allTime.is_up_to_date })
              }
            : {
                  status: 'calculating',
                  percent_calculated: allTimePercent,
                  ...(allTime.message != null && { message: allTime.message })
              };

        const todaysHeartbeats: z.infer<typeof HeartbeatOutputSchema>[] = heartbeats.map((heartbeat) => ({
            entity: heartbeat.entity,
            ...(heartbeat.type != null && { type: heartbeat.type }),
            ...(heartbeat.category != null && { category: heartbeat.category }),
            time: heartbeat.time,
            ...(heartbeat.project != null && { project: heartbeat.project }),
            ...(heartbeat.branch != null && { branch: heartbeat.branch }),
            ...(heartbeat.language != null && { language: heartbeat.language }),
            ...(heartbeat.dependencies != null && {
                dependencies:
                    typeof heartbeat.dependencies === 'string'
                        ? heartbeat.dependencies
                              .split(',')
                              .map((dependency) => dependency.trim())
                              .filter((dependency) => dependency.length > 0)
                        : heartbeat.dependencies
            }),
            ...(heartbeat.machine_name_id != null && { machine_name_id: heartbeat.machine_name_id }),
            ...(heartbeat.is_write != null && { is_write: heartbeat.is_write }),
            ...(heartbeat.lines != null && { lines: heartbeat.lines }),
            ...(heartbeat.lineno != null && { lineno: heartbeat.lineno }),
            ...(heartbeat.cursorpos != null && { cursorpos: heartbeat.cursorpos })
        }));

        const goalsOutput: z.infer<typeof GoalOutputSchema>[] = goals.map((goal) => ({
            id: goal.id,
            ...(goal.title != null && { title: goal.title }),
            ...(goal.custom_title != null && { custom_title: goal.custom_title }),
            ...(goal.type != null && { type: goal.type }),
            ...(goal.delta != null && { delta: goal.delta }),
            ...(goal.seconds != null && { seconds: goal.seconds }),
            ...(goal.status != null && { status: goal.status }),
            ...(goal.cumulative_status != null && { cumulative_status: goal.cumulative_status }),
            ...(goal.average_status != null && { average_status: goal.average_status }),
            ...(goal.is_enabled != null && { is_enabled: goal.is_enabled }),
            ...(goal.is_snoozed != null && { is_snoozed: goal.is_snoozed }),
            ...(goal.is_inverse != null && { is_inverse: goal.is_inverse }),
            ...(goal.ignore_zero_days != null && { ignore_zero_days: goal.ignore_zero_days }),
            ...(goal.range_text != null && { range_text: goal.range_text }),
            ...(goal.languages != null && { languages: goal.languages }),
            ...(goal.projects != null && { projects: goal.projects }),
            ...(goal.editors != null && { editors: goal.editors }),
            ...(goal.created_at != null && { created_at: goal.created_at }),
            ...(goal.modified_at != null && { modified_at: goal.modified_at })
        }));

        return {
            date,
            range,
            profile,
            recent_stats: recentStats,
            todays_heartbeats: todaysHeartbeats,
            goals: goalsOutput,
            all_time: allTimeOutput
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
