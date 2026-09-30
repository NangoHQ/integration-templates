import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

/**
 * Dataverse's Web API truncates `$top`-capped responses without returning an
 * `@odata.nextLink` (and the `odata.maxpagesize` preference is not honored
 * through the proxy), so paging walks a `versionnumber` watermark instead:
 * every page re-queries `$filter=versionnumber gt {lastSeen}` ordered by
 * `versionnumber asc`, and the checkpoint stores the last-seen `versionnumber`.
 * versionnumber is a unique, monotonically increasing rowversion, so unlike
 * modifiedon it never ties across a page boundary or between runs.
 */
const PAGE_SIZE = 100;

/**
 * How often the sync switches from an incremental crawl to an unfiltered full
 * crawl so deletions can be reconciled (Dataverse exposes no deleted-records
 * feed). Cascade-deleted phone calls (e.g. removed together with their parent
 * account) are only detected by these periodic full crawls.
 */
const FULL_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const PHONECALL_SELECT =
    'activityid,versionnumber,subject,description,phonenumber,directioncode,statecode,statuscode,prioritycode,scheduledstart,scheduledend,actualstart,actualend,actualdurationminutes,createdon,modifiedon,_regardingobjectid_value,_ownerid_value,_createdby_value,_modifiedby_value';

const PhoneCallSchema = z
    .object({
        id: z.string().describe('Unique identifier of the phone call activity (Dataverse `activityid` GUID). Example: "1d1d5314-ed24-eb11-a814-000d3a30f257"'),
        subject: z.string().optional().describe('Short summary of the phone call. Example: "Intro call with Kenya"'),
        description: z.string().optional().describe('Detailed notes for the phone call.'),
        phonenumber: z.string().optional().describe('Phone number dialed, in free-text form. Example: "930-555-0168"'),
        directioncode: z.boolean().optional().describe('Direction of the call: true = outgoing, false = incoming.'),
        statecode: z.number().optional().describe('State of the phone call: 0 = Open, 1 = Completed, 2 = Canceled, 3 = Scheduled.'),
        statuscode: z.number().optional().describe('Detailed status reason of the phone call (e.g. 1 = Open, 2 = Made, 3 = Received, 4 = Canceled).'),
        prioritycode: z.number().optional().describe('Priority of the phone call: 0 = Low, 1 = Normal, 2 = High.'),
        scheduledstart: z.string().optional().describe('Scheduled start time of the call (ISO 8601 UTC). Example: "2026-09-16T03:30:00Z"'),
        scheduledend: z.string().optional().describe('Scheduled end time of the call (ISO 8601 UTC).'),
        actualstart: z.string().optional().describe('Actual start time of the call (ISO 8601 UTC).'),
        actualend: z.string().optional().describe('Actual end time of the call (ISO 8601 UTC).'),
        actualdurationminutes: z.number().optional().describe('Actual duration of the call in minutes. Example: 6'),
        regardingobjectid: z.string().optional().describe('GUID of the parent record this call is regarding (e.g. an account, contact, lead, or opportunity).'),
        ownerid: z.string().optional().describe('GUID of the user or team that owns the phone call.'),
        createdby: z.string().optional().describe('GUID of the user who created the phone call record.'),
        modifiedby: z.string().optional().describe('GUID of the user who last modified the phone call record.'),
        createdon: z.string().describe('Timestamp when the record was created (ISO 8601 UTC). Example: "2026-09-18T19:43:40Z"'),
        modifiedon: z
            .string()
            .describe('Timestamp when the record was last modified (ISO 8601 UTC). The incremental sync cursor is the Dataverse versionnumber, not this field.')
    })
    .describe('A Microsoft Dataverse phone call activity.');

const CheckpointSchema = z.object({
    last_version_number: z
        .number()
        .describe(
            'Dataverse versionnumber of the most recent phone call synced; the next incremental crawl only fetches records with versionnumber greater than it. versionnumber is a unique, monotonically increasing rowversion, so unlike modifiedon it never ties across a page boundary. 0 when nothing has been synced yet.'
        ),
    last_full_refresh: z
        .string()
        .describe(
            'ISO 8601 timestamp of when the last unfiltered full crawl (used to detect deletions) completed. Empty string when no full crawl has completed yet.'
        )
});

// Internal schemas used to parse provider responses (null-valued attributes are
// returned as explicit JSON null, omitted when never set, so both are allowed).
const DataversePhoneCallSchema = z.object({
    activityid: z.string(),
    versionnumber: z.number(),
    subject: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    phonenumber: z.string().nullable().optional(),
    directioncode: z.boolean().nullable().optional(),
    statecode: z.number().nullable().optional(),
    statuscode: z.number().nullable().optional(),
    prioritycode: z.number().nullable().optional(),
    scheduledstart: z.string().nullable().optional(),
    scheduledend: z.string().nullable().optional(),
    actualstart: z.string().nullable().optional(),
    actualend: z.string().nullable().optional(),
    actualdurationminutes: z.number().nullable().optional(),
    _regardingobjectid_value: z.string().nullable().optional(),
    _ownerid_value: z.string().nullable().optional(),
    _createdby_value: z.string().nullable().optional(),
    _modifiedby_value: z.string().nullable().optional(),
    createdon: z.string(),
    modifiedon: z.string()
});

const DataverseListResponseSchema = z.object({
    value: z.array(z.unknown())
});

function toPhoneCall(record: z.infer<typeof DataversePhoneCallSchema>) {
    return {
        id: record.activityid,
        ...(record.subject != null && { subject: record.subject }),
        ...(record.description != null && { description: record.description }),
        ...(record.phonenumber != null && { phonenumber: record.phonenumber }),
        ...(record.directioncode != null && { directioncode: record.directioncode }),
        ...(record.statecode != null && { statecode: record.statecode }),
        ...(record.statuscode != null && { statuscode: record.statuscode }),
        ...(record.prioritycode != null && { prioritycode: record.prioritycode }),
        ...(record.scheduledstart != null && { scheduledstart: record.scheduledstart }),
        ...(record.scheduledend != null && { scheduledend: record.scheduledend }),
        ...(record.actualstart != null && { actualstart: record.actualstart }),
        ...(record.actualend != null && { actualend: record.actualend }),
        ...(record.actualdurationminutes != null && { actualdurationminutes: record.actualdurationminutes }),
        ...(record._regardingobjectid_value != null && { regardingobjectid: record._regardingobjectid_value }),
        ...(record._ownerid_value != null && { ownerid: record._ownerid_value }),
        ...(record._createdby_value != null && { createdby: record._createdby_value }),
        ...(record._modifiedby_value != null && { modifiedby: record._modifiedby_value }),
        createdon: record.createdon,
        modifiedon: record.modifiedon
    };
}

const sync = createSync({
    description: 'Sync Microsoft Dataverse phone call activities, incrementally by `versionnumber`, with a periodic full crawl to detect deletions.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        PhoneCall: PhoneCallSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const lastVersionNumber = checkpoint?.last_version_number ?? 0;
        const lastFullRefresh = checkpoint?.last_full_refresh ?? '';

        // A full (unfiltered) crawl runs on the first sync and once every
        // FULL_REFRESH_INTERVAL_MS afterwards; it is the only way deletions are
        // detected, so it is wrapped in trackDeletesStart/trackDeletesEnd.
        const lastFullRefreshMs = lastFullRefresh === '' ? Number.NaN : Date.parse(lastFullRefresh);
        const isFullRefresh = checkpoint === undefined || Number.isNaN(lastFullRefreshMs) || Date.now() - lastFullRefreshMs >= FULL_REFRESH_INTERVAL_MS;

        // Full crawls always start from page 1 (no watermark filter); the
        // intra-run watermark below is pagination state, not a restored cursor.
        // versionnumber is a unique, monotonically increasing rowversion, so unlike
        // modifiedon it never ties across a page boundary and silently drops rows.
        let lastSeen = isFullRefresh ? 0 : lastVersionNumber;
        let maxVersionNumber = lastVersionNumber;
        let hasMore = true;
        let isFirstPage = true;
        let deleteTrackingOpened = false;

        while (hasMore) {
            const config: ProxyConfiguration = {
                // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
                endpoint: '/api/data/v9.2/phonecalls',
                params: {
                    $select: PHONECALL_SELECT,
                    $orderby: 'versionnumber asc',
                    $top: PAGE_SIZE,
                    ...(lastSeen !== 0 && { $filter: `versionnumber gt ${lastSeen}` })
                },
                retries: 3
            };
            const response = await nango.get(config);
            const page = DataverseListResponseSchema.parse(response.data);
            // Parse failures throw (never skip): inside a delete-tracked full crawl
            // a skipped record would be falsely reported as deleted.
            const records = page.value.map((item) => DataversePhoneCallSchema.parse(item));

            // Delete tracking opens only once the first page has been fetched, parsed, and
            // confirmed non-empty, so a failure or empty response before this point never
            // leaves the window open. An empty first page of a full refresh is treated as
            // inconclusive, not proof the table is empty, since acting on it would mark every
            // previously synced phone call as deleted.
            if (isFirstPage && isFullRefresh && records.length > 0) {
                await nango.trackDeletesStart('PhoneCall');
                deleteTrackingOpened = true;
            }
            isFirstPage = false;

            if (records.length > 0) {
                await nango.batchSave(records.map(toPhoneCall), 'PhoneCall');
                const lastRecord = records[records.length - 1];
                if (lastRecord) {
                    lastSeen = lastRecord.versionnumber;
                    maxVersionNumber = lastRecord.versionnumber;
                }

                // Progress is persisted per page on incremental crawls only. During
                // a delete-tracked full crawl the checkpoint is saved exactly once,
                // after the scan completes, so a mid-scan crash retries the full
                // crawl instead of silently skipping deletion detection.
                if (!isFullRefresh) {
                    await nango.saveCheckpoint({ last_version_number: lastSeen, last_full_refresh: lastFullRefresh });
                }
            }

            hasMore = records.length === PAGE_SIZE;
        }

        if (deleteTrackingOpened) {
            await nango.trackDeletesEnd('PhoneCall');
            await nango.saveCheckpoint({ last_version_number: maxVersionNumber, last_full_refresh: new Date().toISOString() });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
