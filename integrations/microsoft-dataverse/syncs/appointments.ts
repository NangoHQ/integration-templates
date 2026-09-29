import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PAGE_SIZE = 500;
const FULL_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const AppointmentSchema = z
    .object({
        id: z.string().describe('Unique identifier of the appointment record (the Dataverse activityid GUID), e.g. "07bc32ab-7a25-eb11-a814-000d3a30f257".'),
        subject: z.string().optional().describe('Short subject line of the appointment, e.g. "Discuss service warranty".'),
        description: z.string().optional().describe('Full body text of the appointment.'),
        scheduledstart: z.string().optional().describe('Scheduled start of the appointment as an ISO 8601 timestamp, e.g. "2026-09-11T15:00:00Z".'),
        scheduledend: z.string().optional().describe('Scheduled end of the appointment as an ISO 8601 timestamp, e.g. "2026-09-11T15:30:00Z".'),
        location: z.string().optional().describe('Free-text location of the appointment, e.g. a meeting room or address.'),
        statecode: z.number().optional().describe('State of the appointment: 0 = Open, 1 = Completed, 2 = Canceled, 3 = Scheduled.'),
        statuscode: z
            .number()
            .optional()
            .describe('Detailed status of the appointment: 1 = Free, 2 = Tentative, 3 = Completed, 4 = Canceled, 5 = Busy, 6 = Out of Office.'),
        prioritycode: z.number().optional().describe('Priority of the appointment: 0 = Low, 1 = Normal, 2 = High.'),
        isalldayevent: z.boolean().optional().describe('Whether the appointment is an all-day event.'),
        activitytypecode: z.string().optional().describe('Activity type discriminator; always "appointment" for records produced by this sync.'),
        createdon: z.string().describe('Timestamp the appointment record was created, as an ISO 8601 timestamp, e.g. "2026-09-18T19:43:41Z".'),
        modifiedon: z.string().describe('Timestamp the appointment record was last modified, as an ISO 8601 timestamp; used as the incremental sync cursor.'),
        ownerid: z.string().optional().describe('GUID of the user or team that owns the appointment (from the _ownerid_value lookup).'),
        regardingobjectid: z
            .string()
            .optional()
            .describe('GUID of the record the appointment is regarding, e.g. an account or contact (from the _regardingobjectid_value lookup).')
    })
    .describe('An appointment activity in Microsoft Dataverse / Dynamics 365.');

// Checkpoint fields must be plain primitives (the Nango SDK only allows string/number/boolean
// checkpoint values), so 0 means "no value stored yet".
const CheckpointSchema = z.object({
    last_version_number: z
        .number()
        .describe(
            'Dataverse versionnumber of the most recent appointment already synced; used as the incremental filter cursor. versionnumber is a unique, monotonically increasing rowversion, so unlike modifiedon it never ties across a page boundary. 0 when nothing has been synced yet.'
        ),
    last_full_refresh: z
        .string()
        .describe('ISO 8601 timestamp of the last completed full refresh used for deletion detection. Empty when no full refresh has completed yet.')
});

// Internal schema for parsing raw Dataverse Web API responses. Field values come back as
// explicit null when empty, hence .nullable(); keys may be absent from a row, hence .optional().
const DataverseAppointmentSchema = z.object({
    activityid: z.string(),
    versionnumber: z.number(),
    subject: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    scheduledstart: z.string().nullable().optional(),
    scheduledend: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    statecode: z.number().nullable().optional(),
    statuscode: z.number().nullable().optional(),
    prioritycode: z.number().nullable().optional(),
    isalldayevent: z.boolean().nullable().optional(),
    activitytypecode: z.string().nullable().optional(),
    createdon: z.string(),
    modifiedon: z.string(),
    _ownerid_value: z.string().nullable().optional(),
    _regardingobjectid_value: z.string().nullable().optional()
});

const DataverseAppointmentsPageSchema = z.object({
    value: z.array(DataverseAppointmentSchema)
});

function toAppointment(record: z.infer<typeof DataverseAppointmentSchema>): z.infer<typeof AppointmentSchema> {
    return {
        id: record.activityid,
        subject: record.subject ?? undefined,
        description: record.description ?? undefined,
        scheduledstart: record.scheduledstart ?? undefined,
        scheduledend: record.scheduledend ?? undefined,
        location: record.location ?? undefined,
        statecode: record.statecode ?? undefined,
        statuscode: record.statuscode ?? undefined,
        prioritycode: record.prioritycode ?? undefined,
        isalldayevent: record.isalldayevent ?? undefined,
        activitytypecode: record.activitytypecode ?? undefined,
        createdon: record.createdon,
        modifiedon: record.modifiedon,
        ownerid: record._ownerid_value ?? undefined,
        regardingobjectid: record._regardingobjectid_value ?? undefined
    };
}

const sync = createSync({
    description:
        'Sync appointment activities from Microsoft Dataverse, incrementally by modifiedon, with a periodic full refresh (every 24h) to detect deletions such as appointments cascade-deleted with their parent record.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Appointment: AppointmentSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : undefined;

        const runStartedAt = new Date();
        const storedVersionNumber = checkpoint?.last_version_number;
        const storedLastFullRefresh = checkpoint?.last_full_refresh ? checkpoint.last_full_refresh : undefined;
        const lastFullRefreshMs = storedLastFullRefresh ? Date.parse(storedLastFullRefresh) : Number.NaN;
        const isFullRefresh = Number.isNaN(lastFullRefreshMs) || runStartedAt.getTime() - lastFullRefreshMs >= FULL_REFRESH_INTERVAL_MS;

        let pageFilter = isFullRefresh ? undefined : storedVersionNumber;
        let lastSeenVersionNumber = storedVersionNumber;
        let hasMore = true;
        let isFirstPage = true;

        // Dataverse does not return @odata.nextLink for $top-truncated results, so paginate by
        // re-filtering on the last-seen versionnumber (keyset pagination) ordered ascending.
        // versionnumber is a unique, monotonically increasing rowversion, so unlike modifiedon it
        // never ties across a page boundary and silently drops rows.
        while (hasMore) {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
            const proxyConfig: ProxyConfiguration = {
                // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/appointment
                endpoint: '/api/data/v9.2/appointments',
                params: {
                    $select:
                        'activityid,versionnumber,subject,description,scheduledstart,scheduledend,location,statecode,statuscode,prioritycode,isalldayevent,activitytypecode,createdon,modifiedon,_ownerid_value,_regardingobjectid_value',
                    $orderby: 'versionnumber asc',
                    $top: PAGE_SIZE,
                    ...(pageFilter !== undefined && { $filter: `versionnumber gt ${pageFilter}` })
                },
                retries: 3
            };
            const response = await nango.get(proxyConfig);
            const page = DataverseAppointmentsPageSchema.parse(response.data);

            // Full refreshes crawl every appointment (no version filter) so that trackDeletesEnd can
            // detect records deleted at the provider. The delete-tracking window opens only once the
            // first page has been fetched and parsed, so a request or parse failure before that point
            // never leaves it open. They always start from the first page, and the checkpoint is
            // persisted only once, after the full scan completes, so an interrupted run restarts the
            // full refresh instead of degrading into a plain incremental run that would silently keep
            // already-deleted records.
            if (isFirstPage && isFullRefresh) {
                await nango.trackDeletesStart('Appointment');
            }
            isFirstPage = false;

            const appointments = page.value.map(toAppointment);

            if (appointments.length > 0) {
                await nango.batchSave(appointments, 'Appointment');
                const lastRecord = page.value[page.value.length - 1];
                if (lastRecord) {
                    lastSeenVersionNumber = lastRecord.versionnumber;
                    pageFilter = lastRecord.versionnumber;
                }

                if (!isFullRefresh) {
                    await nango.saveCheckpoint({
                        last_version_number: lastSeenVersionNumber ?? 0,
                        last_full_refresh: storedLastFullRefresh ?? ''
                    });
                }
            }

            hasMore = appointments.length === PAGE_SIZE;
        }

        if (isFullRefresh) {
            await nango.trackDeletesEnd('Appointment');
            await nango.saveCheckpoint({
                last_version_number: lastSeenVersionNumber ?? 0,
                last_full_refresh: runStartedAt.toISOString()
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
