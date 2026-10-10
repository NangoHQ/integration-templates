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
        lines: z.number().optional().describe('Total number of lines in the entity when the entity type is a file.'),
        lineno: z.number().optional().describe('Cursor line number within the entity when the heartbeat was recorded.'),
        cursorpos: z.number().optional().describe('Cursor column position within the entity when the heartbeat was recorded.'),
        is_write: z.boolean().optional().describe('Whether the heartbeat was triggered by writing to a file.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when WakaTime received the heartbeat.')
    })
    .describe('A single coding-activity heartbeat recorded by WakaTime.');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const INITIAL_LOOKBACK_DAYS = 30;

const CheckpointSchema = z.object({
    start_date: z.string().regex(DATE_PATTERN).describe('Earliest date, in YYYY-MM-DD format, covered by every sync run.'),
    next_date: z.string().regex(DATE_PATTERN).describe('Next date to fetch when resuming an interrupted full scan of the anchored sync window.'),
    resuming: z.boolean().describe('Whether the checkpoint represents an interrupted scan that should resume from next_date.')
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
    lines: z.number().nullish(),
    lineno: z.number().nullish(),
    cursorpos: z.number().nullish(),
    is_write: z.boolean().nullish(),
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
                : heartbeat.dependencies.split(',').map((dependency) => dependency.trim())
        }),
        ...(heartbeat.machine_name_id != null && { machine_name_id: heartbeat.machine_name_id }),
        ...(heartbeat.lines != null && { lines: heartbeat.lines }),
        ...(heartbeat.lineno != null && { lineno: heartbeat.lineno }),
        ...(heartbeat.cursorpos != null && { cursorpos: heartbeat.cursorpos }),
        ...(heartbeat.is_write != null && { is_write: heartbeat.is_write }),
        ...(heartbeat.created_at != null && { created_at: heartbeat.created_at })
    };
}

const sync = createSync({
    description: 'Sync individual coding-activity heartbeats, windowed one day at a time.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Heartbeat: HeartbeatSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();

        let startDate: string;
        let date: string;

        if (rawCheckpoint == null) {
            // First run: begin the window at a bounded lookback so the initial sync
            // stays small while still backfilling recent history.
            startDate = defaultStartDate();
            date = startDate;
        } else {
            const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);

            if (!checkpointResult.success) {
                throw new Error(`Invalid heartbeats sync checkpoint: ${checkpointResult.error.message}`);
            }

            // The window start is persisted so every run re-fetches every day the
            // sync has already covered. Combined with trackDeletesStart/trackDeletesEnd
            // this is the only way to detect a heartbeat deleted after it was first synced.
            startDate = checkpointResult.data.start_date;
            date = checkpointResult.data.resuming ? checkpointResult.data.next_date : checkpointResult.data.start_date;
        }

        const endDate = formatDate(new Date());

        if (startDate > endDate) {
            throw new Error(`Invalid heartbeats sync checkpoint: start_date ${startDate} is in the future`);
        }

        const startingFresh = rawCheckpoint == null || date === startDate;

        // Delete tracking only runs on fresh scans from the anchored start date.
        // A resumed run begins mid-window and would otherwise false-delete earlier days.
        if (startingFresh) {
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

            if (nextDate <= endDate) {
                await nango.saveCheckpoint({
                    start_date: startDate,
                    next_date: nextDate,
                    resuming: true
                });
            }

            date = nextDate;
        }

        // Clear the resume position while keeping the anchored window start so the
        // next scheduled run begins another full scan from the earliest synced day.
        await nango.saveCheckpoint({
            start_date: startDate,
            next_date: startDate,
            resuming: false
        });

        if (startingFresh) {
            await nango.trackDeletesEnd('Heartbeat');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
