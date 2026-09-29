import { createSync } from 'nango';
import { z } from 'zod';

const PAGE_SIZE = 1000;
const FULL_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

const EmailSchema = z
    .object({
        id: z.string().describe('Unique identifier of the email activity. Dataverse activityid GUID, e.g. "513aa844-99b3-f111-aaac-0022480c377a".'),
        subject: z.string().optional().describe('Subject line of the email.'),
        description: z.string().optional().describe('Body of the email. May contain HTML markup.'),
        sender: z.string().optional().describe('Email address of the sender.'),
        torecipients: z.string().optional().describe('Email addresses of the primary recipients, separated by semicolons.'),
        directioncode: z.boolean().optional().describe('Direction of the email. true = outgoing, false = incoming.'),
        statecode: z.number().optional().describe('Status of the email activity. 0 = Open, 1 = Completed, 2 = Canceled.'),
        statuscode: z.number().optional().describe('Detailed status reason of the email activity.'),
        scheduledstart: z.string().optional().describe('Scheduled start time of the email activity as an ISO 8601 UTC timestamp.'),
        scheduledend: z.string().optional().describe('Scheduled end time of the email activity as an ISO 8601 UTC timestamp.'),
        senton: z.string().optional().describe('Time the email was actually sent as an ISO 8601 UTC timestamp.'),
        regardingobjectid: z.string().optional().describe('GUID of the record (e.g. account, contact, opportunity) the email is regarding.'),
        createdon: z.string().optional().describe('Time the email record was created as an ISO 8601 UTC timestamp, e.g. "2026-09-18T19:43:53Z".'),
        modifiedon: z
            .string()
            .optional()
            .describe('Time the email record was last modified as an ISO 8601 UTC timestamp. Used as the incremental checkpoint value.')
    })
    .describe('An email activity from the Dataverse emails entity set.');

// The SDK requires flat checkpoint objects with required primitive values, so both
// fields are always written together. A missing or legacy-shaped stored checkpoint is
// treated as "no checkpoint" via safeParse below.
const CheckpointSchema = z.object({
    lastModified: z.string(),
    lastFullRefresh: z.string()
});

// Raw provider shape. Dataverse returns explicit nulls for unset attributes when no
// $select is applied, so every non-key field must tolerate both null and omission.
const DataverseEmailSchema = z.object({
    activityid: z.string(),
    subject: z.string().nullish(),
    description: z.string().nullish(),
    sender: z.string().nullish(),
    torecipients: z.string().nullish(),
    directioncode: z.boolean().nullish(),
    statecode: z.number().nullish(),
    statuscode: z.number().nullish(),
    scheduledstart: z.string().nullish(),
    scheduledend: z.string().nullish(),
    senton: z.string().nullish(),
    createdon: z.string().nullish(),
    modifiedon: z.string().nullish(),
    _regardingobjectid_value: z.string().nullish()
});

const DataverseEmailListResponseSchema = z.object({
    value: z.array(DataverseEmailSchema),
    '@odata.nextLink': z.string().optional()
});

type DataverseEmail = z.infer<typeof DataverseEmailSchema>;

function buildListParams(modifiedAfter: string | undefined): Record<string, string | number> {
    return {
        $orderby: 'modifiedon asc',
        $top: PAGE_SIZE,
        ...(modifiedAfter !== undefined && { $filter: `modifiedon gt ${modifiedAfter}` })
    };
}

function toEmail(record: DataverseEmail): z.infer<typeof EmailSchema> {
    return {
        id: record.activityid,
        ...(record.subject != null && { subject: record.subject }),
        ...(record.description != null && { description: record.description }),
        ...(record.sender != null && { sender: record.sender }),
        ...(record.torecipients != null && { torecipients: record.torecipients }),
        ...(record.directioncode != null && { directioncode: record.directioncode }),
        ...(record.statecode != null && { statecode: record.statecode }),
        ...(record.statuscode != null && { statuscode: record.statuscode }),
        ...(record.scheduledstart != null && { scheduledstart: record.scheduledstart }),
        ...(record.scheduledend != null && { scheduledend: record.scheduledend }),
        ...(record.senton != null && { senton: record.senton }),
        ...(record._regardingobjectid_value != null && { regardingobjectid: record._regardingobjectid_value }),
        ...(record.createdon != null && { createdon: record.createdon }),
        ...(record.modifiedon != null && { modifiedon: record.modifiedon })
    };
}

const sync = createSync({
    description: 'Sync email activities from Microsoft Dataverse, incrementally by modifiedon with a periodic full refresh to detect deletions.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Email: EmailSchema
    },
    scopes: ['user_impersonation'],

    exec: async (nango) => {
        const storedCheckpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        const checkpoint = storedCheckpoint.success ? storedCheckpoint.data : undefined;
        const now = new Date().toISOString();
        const lastFullRefreshMs = checkpoint !== undefined ? Date.parse(checkpoint.lastFullRefresh) : Number.NaN;
        const fullRefresh = checkpoint === undefined || Number.isNaN(lastFullRefreshMs) || lastFullRefreshMs + FULL_REFRESH_INTERVAL_MS <= Date.now();

        if (fullRefresh) {
            // Dataverse Web API exposes no deleted-records feed, and emails can disappear
            // through cascade deletes when their parent record is removed, so the periodic
            // full crawl is wrapped in delete tracking. The checkpoint is intentionally not
            // persisted mid-scan: a crashed run must restart as a delete-tracked full crawl.
            await nango.trackDeletesStart('Email');
        }

        let lastSeenModified = checkpoint?.lastModified;
        let windowCount = 0;
        let endpoint: string | undefined = '/api/data/v9.2/emails';
        let params: Record<string, string | number> | undefined = buildListParams(fullRefresh ? undefined : checkpoint?.lastModified);

        while (endpoint !== undefined) {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
            const response = await nango.get({
                endpoint,
                ...(params !== undefined && { params }),
                retries: 3
            });
            const page = DataverseEmailListResponseSchema.parse(response.data);
            windowCount += page.value.length;

            if (page.value.length > 0) {
                await nango.batchSave(page.value.map(toEmail), 'Email');
                const pageLastModified = page.value[page.value.length - 1]?.modifiedon;
                if (pageLastModified != null) {
                    lastSeenModified = pageLastModified;
                }
                if (!fullRefresh && lastSeenModified !== undefined && checkpoint !== undefined) {
                    await nango.saveCheckpoint({
                        lastModified: lastSeenModified,
                        lastFullRefresh: checkpoint.lastFullRefresh
                    });
                }
            }

            const nextLink = page['@odata.nextLink'];
            if (nextLink !== undefined) {
                // Defensive: $top-capped pages stay below the org's server-driven page size,
                // so Dataverse normally never emits @odata.nextLink. Follow it if a tenant
                // lowered the max page size below PAGE_SIZE. Only the path and query are
                // kept so the request stays on the configured environment URL.
                const url = new URL(nextLink);
                endpoint = url.pathname + url.search;
                params = undefined;
            } else if (windowCount >= PAGE_SIZE && lastSeenModified !== undefined) {
                windowCount = 0;
                endpoint = '/api/data/v9.2/emails';
                params = buildListParams(lastSeenModified);
            } else {
                endpoint = undefined;
            }
        }

        if (fullRefresh) {
            // Close delete tracking before advancing the full-refresh checkpoint. If
            // trackDeletesEnd() fails, the next run must retry the delete-tracked crawl.
            await nango.trackDeletesEnd('Email');
            await nango.saveCheckpoint({
                lastModified: lastSeenModified ?? now,
                lastFullRefresh: now
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
