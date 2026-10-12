import { createSync } from 'nango';
import { z } from 'zod';

const HeartbeatSchema = z
    .object({
        id: z.string().describe('Unique identifier of the heartbeat.'),
        entity: z.string().optional().describe('Absolute file path, domain, or app the heartbeat is logging time against.'),
        type: z.string().optional().describe('Type of entity the heartbeat was logged against, such as file, app, url, or domain.'),
        category: z.string().optional().describe('Coding category for the activity, such as coding, debugging, or writing tests.'),
        time: z.number().optional().describe('UNIX epoch timestamp, in seconds, when the heartbeat was recorded.'),
        project: z.string().optional().describe('Name of the project the heartbeat belongs to.'),
        project_root_count: z.number().optional().describe('Number of folders in the project root path of the entity.'),
        branch: z.string().optional().describe('Version control branch the heartbeat was recorded on.'),
        language: z.string().optional().describe('Programming language detected for the heartbeat.'),
        dependencies: z.array(z.string()).optional().describe('Dependencies detected in the entity file.'),
        machine_name_id: z.string().optional().describe('Unique identifier of the machine that generated the heartbeat.'),
        user_agent_id: z.string().optional().describe('Unique identifier of the editor/plugin that generated the heartbeat.'),
        user_id: z.string().optional().describe('Unique identifier of the user the heartbeat belongs to.'),
        lines: z.number().optional().describe('Total number of lines in the entity when the entity type is a file.'),
        lineno: z.number().optional().describe('Cursor line number within the entity when the heartbeat was recorded.'),
        cursorpos: z.number().optional().describe('Cursor column position within the entity when the heartbeat was recorded.'),
        is_write: z.boolean().optional().describe('Whether the heartbeat was triggered by writing to a file.'),
        ai_line_changes: z.number().optional().describe('Number of lines added or removed by GenAI since the previous heartbeat.'),
        human_line_changes: z.number().optional().describe('Number of lines added or removed by typing since the previous heartbeat.'),
        ai_session: z.string().optional().describe('Identifier of the AI session associated with the heartbeat.'),
        ai_input_tokens: z.number().optional().describe('Number of user input tokens used by GenAI tools since the previous heartbeat.'),
        ai_cached_input_tokens: z.number().optional().describe('Number of cached input tokens used by GenAI tools since the previous heartbeat.'),
        ai_output_tokens: z.number().optional().describe('Number of output tokens used by GenAI tools since the previous heartbeat.'),
        ai_prompt_length: z.number().optional().describe('Number of user prompt characters typed to AI since the previous heartbeat.'),
        ai_subscription_plan: z.string().optional().describe('Subscription plan of the GenAI tool used for this heartbeat.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when WakaTime received the heartbeat.')
    })
    .describe('A single coding-activity heartbeat recorded by WakaTime.');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const INITIAL_LOOKBACK_DAYS = 30;
// Routine runs only re-fetch this many recent days, which is enough to pick up late-ingested heartbeats.
const RECENT_LOOKBACK_DAYS = 2;
// Detecting deleted heartbeats needs a full re-fetch of every synced day, so it only runs this often.
const FULL_SCAN_INTERVAL_DAYS = 7;

const CheckpointSchema = z.object({
    start_date: z.string().regex(DATE_PATTERN).describe('Earliest date, in YYYY-MM-DD format, covered by the sync window.'),
    next_date: z.string().regex(DATE_PATTERN).describe('Next date to fetch when resuming an interrupted full scan of the anchored sync window.'),
    resuming: z.boolean().describe('Whether the checkpoint represents an interrupted full scan that should resume from next_date.'),
    last_full_scan_date: z
        .string()
        .regex(/^(\d{4}-\d{2}-\d{2})?$/)
        .describe('UTC date, in YYYY-MM-DD format, on which the last full scan (with delete detection) completed; empty when none has yet.')
});

const ProviderHeartbeatSchema = z.object({
    id: z.string(),
    entity: z.string().nullish(),
    type: z.string().nullish(),
    category: z.string().nullish(),
    time: z.number().nullish(),
    project: z.string().nullish(),
    project_root_count: z.number().nullish(),
    branch: z.string().nullish(),
    language: z.string().nullish(),
    dependencies: z.union([z.array(z.string()), z.string()]).nullish(),
    machine_name_id: z.string().nullish(),
    user_agent_id: z.string().nullish(),
    user_id: z.string().nullish(),
    lines: z.number().nullish(),
    lineno: z.number().nullish(),
    cursorpos: z.number().nullish(),
    is_write: z.boolean().nullish(),
    ai_line_changes: z.number().nullish(),
    human_line_changes: z.number().nullish(),
    ai_session: z.string().nullish(),
    ai_input_tokens: z.number().nullish(),
    ai_cached_input_tokens: z.number().nullish(),
    ai_output_tokens: z.number().nullish(),
    ai_prompt_length: z.number().nullish(),
    ai_subscription_plan: z.string().nullish(),
    created_at: z.string().nullish()
});

const ProviderHeartbeatsResponseSchema = z.object({
    data: z.array(ProviderHeartbeatSchema)
});

function formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function defaultStartDate(): string {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - INITIAL_LOOKBACK_DAYS);
    return formatDate(date);
}

function addDays(date: string, days: number): string {
    const next = new Date(`${date}T00:00:00.000Z`);
    next.setUTCDate(next.getUTCDate() + days);
    return formatDate(next);
}

function toHeartbeat(heartbeat: z.infer<typeof ProviderHeartbeatSchema>): z.infer<typeof HeartbeatSchema> {
    return {
        id: heartbeat.id,
        ...(heartbeat.entity != null && { entity: heartbeat.entity }),
        ...(heartbeat.type != null && { type: heartbeat.type }),
        ...(heartbeat.category != null && { category: heartbeat.category }),
        ...(heartbeat.time != null && { time: heartbeat.time }),
        ...(heartbeat.project != null && { project: heartbeat.project }),
        ...(heartbeat.project_root_count != null && { project_root_count: heartbeat.project_root_count }),
        ...(heartbeat.branch != null && { branch: heartbeat.branch }),
        ...(heartbeat.language != null && { language: heartbeat.language }),
        ...(heartbeat.dependencies != null && {
            dependencies: Array.isArray(heartbeat.dependencies)
                ? heartbeat.dependencies
                : heartbeat.dependencies
                      .split(',')
                      .map((dependency) => dependency.trim())
                      .filter((dependency) => dependency.length > 0)
        }),
        ...(heartbeat.machine_name_id != null && { machine_name_id: heartbeat.machine_name_id }),
        ...(heartbeat.user_agent_id != null && { user_agent_id: heartbeat.user_agent_id }),
        ...(heartbeat.user_id != null && { user_id: heartbeat.user_id }),
        ...(heartbeat.lines != null && { lines: heartbeat.lines }),
        ...(heartbeat.lineno != null && { lineno: heartbeat.lineno }),
        ...(heartbeat.cursorpos != null && { cursorpos: heartbeat.cursorpos }),
        ...(heartbeat.is_write != null && { is_write: heartbeat.is_write }),
        ...(heartbeat.ai_line_changes != null && { ai_line_changes: heartbeat.ai_line_changes }),
        ...(heartbeat.human_line_changes != null && { human_line_changes: heartbeat.human_line_changes }),
        ...(heartbeat.ai_session != null && { ai_session: heartbeat.ai_session }),
        ...(heartbeat.ai_input_tokens != null && { ai_input_tokens: heartbeat.ai_input_tokens }),
        ...(heartbeat.ai_cached_input_tokens != null && { ai_cached_input_tokens: heartbeat.ai_cached_input_tokens }),
        ...(heartbeat.ai_output_tokens != null && { ai_output_tokens: heartbeat.ai_output_tokens }),
        ...(heartbeat.ai_prompt_length != null && { ai_prompt_length: heartbeat.ai_prompt_length }),
        ...(heartbeat.ai_subscription_plan != null && { ai_subscription_plan: heartbeat.ai_subscription_plan }),
        ...(heartbeat.created_at != null && { created_at: heartbeat.created_at })
    };
}

const sync = createSync({
    description: 'Sync individual coding-activity heartbeats, windowed one day at a time.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    scopes: ['read_heartbeats'],
    models: {
        Heartbeat: HeartbeatSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const today = formatDate(new Date());
        // Days are bounded in the account's timezone, so accounts ahead of UTC are already on the next day.
        // Fetching through tomorrow (UTC) covers their local today; a day that has not started yet is just empty.
        const endDate = addDays(today, 1);

        let startDate: string;
        let lastFullScanDate = '';
        let date: string;
        let fullScan: boolean;

        if (rawCheckpoint == null) {
            // First run: begin the window at a bounded lookback so the initial sync
            // stays small while still backfilling recent history.
            startDate = defaultStartDate();
            date = startDate;
            fullScan = true;
        } else {
            const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);

            if (!checkpointResult.success) {
                throw new Error(`Invalid heartbeats sync checkpoint: ${checkpointResult.error.message}`);
            }

            const checkpoint = checkpointResult.data;
            startDate = checkpoint.start_date;
            lastFullScanDate = checkpoint.last_full_scan_date;

            if (checkpoint.resuming) {
                // Only full scans save per-day progress, so a resumable checkpoint always continues one.
                date = checkpoint.next_date;
                fullScan = true;
            } else if (lastFullScanDate === '' || addDays(lastFullScanDate, FULL_SCAN_INTERVAL_DAYS) <= today) {
                // The window start is persisted so a periodic full scan re-fetches every day the sync
                // has covered. Combined with trackDeletesStart/trackDeletesEnd this is the only way to
                // detect a heartbeat deleted after it was first synced.
                date = startDate;
                fullScan = true;
            } else {
                // Routine run: only re-fetch recent days to pick up new and late-ingested heartbeats.
                const recentStart = addDays(today, -RECENT_LOOKBACK_DAYS);
                date = recentStart > startDate ? recentStart : startDate;
                fullScan = false;
            }
        }

        if (startDate > endDate) {
            throw new Error(`Invalid heartbeats sync checkpoint: start_date ${startDate} is in the future`);
        }

        // Delete tracking only runs on full scans that start from the anchored start date.
        // Resumed and routine runs begin mid-window and would otherwise false-delete earlier days.
        const trackDeletes = fullScan && date === startDate;

        if (trackDeletes) {
            await nango.trackDeletesStart('Heartbeat');
        }

        while (date <= endDate) {
            // https://wakatime.com/developers#heartbeats
            const response = await nango.get<unknown>({
                endpoint: '/api/v1/users/current/heartbeats',
                params: {
                    date
                },
                retries: 3
            });

            const parsed = ProviderHeartbeatsResponseSchema.safeParse(response.data);

            if (!parsed.success) {
                throw new Error(`Unexpected heartbeats response for ${date}: ${parsed.error.message}`);
            }

            const heartbeats = parsed.data.data.map(toHeartbeat);

            if (heartbeats.length > 0) {
                await nango.batchSave(heartbeats, 'Heartbeat');
            }

            const nextDate = addDays(date, 1);

            if (fullScan && nextDate <= endDate) {
                await nango.saveCheckpoint({
                    start_date: startDate,
                    next_date: nextDate,
                    resuming: true,
                    last_full_scan_date: lastFullScanDate
                });
            }

            date = nextDate;
        }

        // A resumed scan skipped delete detection, so it does not count and the next run scans in full again.
        if (trackDeletes) {
            lastFullScanDate = today;
        }

        // Clear the resume position while keeping the anchored window start so the
        // next full scan begins again from the earliest synced day.
        await nango.saveCheckpoint({
            start_date: startDate,
            next_date: startDate,
            resuming: false,
            last_full_scan_date: lastFullScanDate
        });

        if (trackDeletes) {
            await nango.trackDeletesEnd('Heartbeat');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
