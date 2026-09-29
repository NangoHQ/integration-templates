import { createSync } from 'nango';
import { z } from 'zod';

const PAGE_SIZE = 100;
const FULL_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const TaskSchema = z
    .object({
        id: z.string().describe('Unique identifier of the task record (the Dataverse `activityid` GUID). Example: "f6f57339-4687-eb11-a812-000d3a09c1c0"'),
        subject: z.string().optional().describe('Subject or short title of the task.'),
        description: z.string().optional().describe('Full description or body text of the task.'),
        scheduledstart: z.string().optional().describe('Scheduled start time of the task as an ISO 8601 UTC timestamp.'),
        scheduledend: z.string().optional().describe('Scheduled end (due) time of the task as an ISO 8601 UTC timestamp.'),
        actualdurationminutes: z.number().optional().describe('Actual duration of the task in minutes.'),
        percentcomplete: z.number().optional().describe('Completion percentage of the task (0-100).'),
        prioritycode: z.number().optional().describe('Priority of the task as a Dataverse option-set value (0 = Low, 1 = Normal, 2 = High).'),
        statecode: z.number().optional().describe('State of the task as a Dataverse option-set value (0 = Open, 1 = Completed, 2 = Canceled).'),
        statuscode: z.number().optional().describe('Detailed status of the task as a Dataverse option-set value, tied to `statecode`.'),
        ownerid: z.string().optional().describe('GUID of the user or team that owns the task (from the `_ownerid_value` lookup).'),
        regardingobjectid: z
            .string()
            .optional()
            .describe('GUID of the parent record this task is regarding, e.g. an account or contact (from the `_regardingobjectid_value` lookup).'),
        createdon: z.string().optional().describe('Timestamp the task was created, as an ISO 8601 UTC string.'),
        modifiedon: z.string().describe('Timestamp the task was last modified, as an ISO 8601 UTC string. Used as the incremental sync cursor.')
    })
    .describe('A task activity in Microsoft Dataverse (the OData v4 data platform underlying Dynamics 365 CRM).');

// Checkpoint fields must be bare primitives per the createSync checkpoint contract, so
// "no value yet" is stored as an empty string / 0 and reads go through a partial schema.
const CheckpointSchema = z.object({
    last_version_number: z.number(),
    last_full_refresh: z.string()
});

// Internal schema for the raw Dataverse Web API response. Dataverse returns every
// attribute of the record, with an explicit null for fields that have no value.
const DataverseTaskSchema = z.object({
    activityid: z.string(),
    versionnumber: z.number(),
    subject: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    scheduledstart: z.string().nullable().optional(),
    scheduledend: z.string().nullable().optional(),
    actualdurationminutes: z.number().nullable().optional(),
    percentcomplete: z.number().nullable().optional(),
    prioritycode: z.number().nullable().optional(),
    statecode: z.number().nullable().optional(),
    statuscode: z.number().nullable().optional(),
    _ownerid_value: z.string().nullable().optional(),
    _regardingobjectid_value: z.string().nullable().optional(),
    createdon: z.string().nullable().optional(),
    modifiedon: z.string()
});

const DataverseTaskListResponseSchema = z.object({
    value: z.array(DataverseTaskSchema)
});

type DataverseTask = z.infer<typeof DataverseTaskSchema>;

function toTask(record: DataverseTask) {
    return {
        id: record.activityid,
        ...(record.subject != null && { subject: record.subject }),
        ...(record.description != null && { description: record.description }),
        ...(record.scheduledstart != null && { scheduledstart: record.scheduledstart }),
        ...(record.scheduledend != null && { scheduledend: record.scheduledend }),
        ...(record.actualdurationminutes != null && { actualdurationminutes: record.actualdurationminutes }),
        ...(record.percentcomplete != null && { percentcomplete: record.percentcomplete }),
        ...(record.prioritycode != null && { prioritycode: record.prioritycode }),
        ...(record.statecode != null && { statecode: record.statecode }),
        ...(record.statuscode != null && { statuscode: record.statuscode }),
        ...(record._ownerid_value != null && { ownerid: record._ownerid_value }),
        ...(record._regardingobjectid_value != null && { regardingobjectid: record._regardingobjectid_value }),
        ...(record.createdon != null && { createdon: record.createdon }),
        modifiedon: record.modifiedon
    };
}

const sync = createSync({
    description: 'Sync task activities from Microsoft Dataverse, incrementally on `modifiedon`, with a periodic full refresh to detect deletions.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Task: TaskSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.partial().parse((await nango.getCheckpoint()) ?? {});
        const lastVersionNumber = checkpoint.last_version_number;
        const lastFullRefresh = checkpoint.last_full_refresh || undefined;

        const fetchPage = async (versionAfter: number | undefined): Promise<DataverseTask[]> => {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
            const response = await nango.get({
                endpoint: '/api/data/v9.2/tasks',
                params: {
                    ...(versionAfter !== undefined && { $filter: `versionnumber gt ${versionAfter}` }),
                    $orderby: 'versionnumber asc',
                    $top: PAGE_SIZE
                },
                retries: 3
            });
            return DataverseTaskListResponseSchema.parse(response.data).value;
        };

        const parsedLastFullRefresh = lastFullRefresh ? Date.parse(lastFullRefresh) : Number.NaN;
        const fullRefreshDue = Number.isNaN(parsedLastFullRefresh) || Date.now() - parsedLastFullRefresh >= FULL_REFRESH_INTERVAL_MS;

        // Pages are walked with a `versionnumber gt {marker}` keyset filter ordered by
        // `versionnumber asc` and capped with `$top`, because `$top` is a hard cap that
        // returns no `@odata.nextLink` and the `odata.maxpagesize` preference header is
        // not honored through the Nango proxy for this API. versionnumber is a unique,
        // monotonically increasing rowversion, so (unlike modifiedon) it can never tie
        // across a page boundary and silently drop the remaining rows of that page.
        let marker = fullRefreshDue ? undefined : lastVersionNumber;
        let maxVersionNumber: number | undefined;
        let hasMorePages = true;
        let isFirstPage = true;
        while (hasMorePages) {
            const records = await fetchPage(marker);

            // A full refresh walks the entire table starting from page 1 inside a delete
            // tracking window: the Dataverse Web API has no deleted-records feed, and task
            // activities can disappear via cascade deletes without touching surviving rows,
            // which an incremental-only crawl would miss. The window opens only once the
            // first page has been fetched and parsed, so a failure before any data is seen
            // never leaves it open. No checkpoint is persisted mid-scan so a crashed run
            // retries the full refresh.
            if (isFirstPage && fullRefreshDue) {
                await nango.trackDeletesStart('Task');
            }
            isFirstPage = false;

            hasMorePages = records.length === PAGE_SIZE;
            const lastRecord = records.at(-1);
            if (records.length > 0 && lastRecord) {
                await nango.batchSave(records.map(toTask), 'Task');
                marker = lastRecord.versionnumber;
                maxVersionNumber = lastRecord.versionnumber;
                if (!fullRefreshDue) {
                    // Incremental runs checkpoint on the last-seen `versionnumber` of each
                    // page so a run that exceeds the execution window resumes there.
                    await nango.saveCheckpoint({
                        last_version_number: marker,
                        last_full_refresh: lastFullRefresh ?? ''
                    });
                }
            }
        }

        if (fullRefreshDue) {
            await nango.trackDeletesEnd('Task');
        }
        await nango.saveCheckpoint({
            last_version_number: maxVersionNumber ?? lastVersionNumber ?? 0,
            last_full_refresh: fullRefreshDue ? new Date().toISOString() : (lastFullRefresh ?? '')
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
