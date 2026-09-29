import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

/**
 * Raw Dataverse Web API opportunity payload (subset requested via $select).
 * Lookup columns surface as `_<lookupLogicalName>_value` properties and fields
 * without a value come back as explicit null, hence .nullable() in addition to
 * .optional().
 * https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/opportunity
 */
const DataverseOpportunitySchema = z.object({
    opportunityid: z.string(),
    versionnumber: z.number(),
    name: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    emailaddress: z.string().optional().nullable(),
    estimatedvalue: z.number().optional().nullable(),
    estimatedclosedate: z.string().optional().nullable(),
    actualvalue: z.number().optional().nullable(),
    actualclosedate: z.string().optional().nullable(),
    closeprobability: z.number().optional().nullable(),
    stepname: z.string().optional().nullable(),
    salesstagecode: z.number().optional().nullable(),
    statecode: z.number().optional().nullable(),
    statuscode: z.number().optional().nullable(),
    createdon: z.string(),
    modifiedon: z.string(),
    _customerid_value: z.string().optional().nullable(),
    _parentaccountid_value: z.string().optional().nullable(),
    _parentcontactid_value: z.string().optional().nullable(),
    _ownerid_value: z.string().optional().nullable(),
    _transactioncurrencyid_value: z.string().optional().nullable()
});

/**
 * Dataverse list response envelope. `@odata.nextLink` (an absolute URL for the
 * next page) is only emitted when a result set exceeds the server page size;
 * it is never emitted on `$top`-capped requests.
 */
const DataverseListResponseSchema = z.object({
    value: z.array(DataverseOpportunitySchema),
    '@odata.nextLink': z.string().optional()
});

const OpportunitySchema = z
    .object({
        id: z.string().describe('Unique identifier of the opportunity (Dataverse opportunityid GUID). Example: e90a0493-e8f0-ea11-a815-000d3a1b14a2'),
        name: z.string().optional().describe('Subject or title of the opportunity.'),
        description: z.string().optional().describe('Free-text description of the opportunity.'),
        emailaddress: z.string().optional().describe('Primary contact email address stored on the opportunity.'),
        estimatedvalue: z.number().optional().describe('Estimated revenue of the opportunity in the transaction currency.'),
        estimatedclosedate: z.string().optional().describe('Estimated close date as an ISO 8601 date. Example: 2026-10-23'),
        actualvalue: z.number().optional().describe('Actual revenue of the opportunity in the transaction currency, set when the opportunity is closed.'),
        actualclosedate: z.string().optional().describe('Actual close date as an ISO 8601 date; omitted while the opportunity is still open.'),
        closeprobability: z.number().optional().describe('Probability of closing the opportunity as an integer between 0 and 100.'),
        stepname: z.string().optional().describe('Display name of the current stage in the sales process. Example: 1-Qualify'),
        salesstagecode: z.number().optional().describe('Sales stage option set value.'),
        statecode: z.number().optional().describe('State of the opportunity: 0 = Open, 1 = Won, 2 = Lost.'),
        statuscode: z.number().optional().describe('Status reason option set value paired with statecode.'),
        createdon: z.string().describe('ISO 8601 timestamp when the opportunity record was created. Example: 2026-09-18T19:43:18Z'),
        modifiedon: z
            .string()
            .describe('ISO 8601 timestamp when the opportunity record was last modified; drives the incremental sync. Example: 2026-09-18T19:44:35Z'),
        _customerid_value: z.string().optional().describe('GUID of the customer (account or contact) associated with the opportunity.'),
        _parentaccountid_value: z.string().optional().describe('GUID of the parent account for the opportunity.'),
        _parentcontactid_value: z.string().optional().describe('GUID of the parent contact for the opportunity.'),
        _ownerid_value: z.string().optional().describe('GUID of the user or team that owns the opportunity.'),
        _transactioncurrencyid_value: z.string().optional().describe('GUID of the transaction currency record used for money fields.')
    })
    .describe('A Microsoft Dataverse sales opportunity.');

const CheckpointSchema = z.object({
    last_version_number: z
        .number()
        .describe(
            'Dataverse versionnumber of the most recently synced opportunity; the next incremental run fetches records with versionnumber greater than this value. versionnumber is a unique, monotonically increasing rowversion, so unlike modifiedon it never ties across a page boundary.'
        ),
    last_full_refresh: z.string().describe('ISO 8601 timestamp of when the last unfiltered full crawl (used for deletion detection) completed.')
});

const PAGE_SIZE = 100;

// The Dataverse Web API exposes no deleted-records feed, so deletions are
// detected by re-crawling the full entity set at most once per day.
const FULL_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const SELECT_FIELDS =
    'opportunityid,versionnumber,name,description,emailaddress,estimatedvalue,estimatedclosedate,actualvalue,actualclosedate,closeprobability,stepname,salesstagecode,statecode,statuscode,createdon,modifiedon,_customerid_value,_parentaccountid_value,_parentcontactid_value,_ownerid_value,_transactioncurrencyid_value';

function toOpportunity(record: z.infer<typeof DataverseOpportunitySchema>): z.infer<typeof OpportunitySchema> {
    return {
        id: record.opportunityid,
        ...(record.name != null && { name: record.name }),
        ...(record.description != null && { description: record.description }),
        ...(record.emailaddress != null && { emailaddress: record.emailaddress }),
        ...(record.estimatedvalue != null && { estimatedvalue: record.estimatedvalue }),
        ...(record.estimatedclosedate != null && { estimatedclosedate: record.estimatedclosedate }),
        ...(record.actualvalue != null && { actualvalue: record.actualvalue }),
        ...(record.actualclosedate != null && { actualclosedate: record.actualclosedate }),
        ...(record.closeprobability != null && { closeprobability: record.closeprobability }),
        ...(record.stepname != null && { stepname: record.stepname }),
        ...(record.salesstagecode != null && { salesstagecode: record.salesstagecode }),
        ...(record.statecode != null && { statecode: record.statecode }),
        ...(record.statuscode != null && { statuscode: record.statuscode }),
        ...(record._customerid_value != null && { _customerid_value: record._customerid_value }),
        ...(record._parentaccountid_value != null && { _parentaccountid_value: record._parentaccountid_value }),
        ...(record._parentcontactid_value != null && { _parentcontactid_value: record._parentcontactid_value }),
        ...(record._ownerid_value != null && { _ownerid_value: record._ownerid_value }),
        ...(record._transactioncurrencyid_value != null && { _transactioncurrencyid_value: record._transactioncurrencyid_value }),
        createdon: record.createdon,
        modifiedon: record.modifiedon
    };
}

const sync = createSync({
    description: 'Sync sales opportunities from Microsoft Dataverse, incrementally by modifiedon with a periodic full refresh to detect deletions.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Opportunity: OpportunitySchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const lastVersionNumber = checkpoint?.last_version_number;
        const previousFullRefresh = checkpoint?.last_full_refresh;
        const runStartedAt = new Date().toISOString();

        const lastFullRefreshMs = previousFullRefresh !== undefined ? Date.parse(previousFullRefresh) : Number.NaN;
        const isFullRefresh = lastVersionNumber === undefined || Number.isNaN(lastFullRefreshMs) || Date.now() - lastFullRefreshMs >= FULL_REFRESH_INTERVAL_MS;

        let lastSeenVersionNumber: number | undefined;
        let isFirstPage = true;

        if (isFullRefresh) {
            // The full crawl intentionally does NOT use $top: Dataverse does
            // not emit @odata.nextLink on $top-capped requests (verified live)
            // and $skip is rejected, so a capped request would silently
            // truncate the crawl and trackDeletesEnd would falsely delete the
            // records beyond the cap.
            let endpoint = '/api/data/v9.2/opportunities';
            let params: Record<string, string | number> | undefined = {
                $select: SELECT_FIELDS,
                $orderby: 'modifiedon asc'
            };
            let hasNextPage = true;

            do {
                // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
                const proxyConfig: ProxyConfiguration = {
                    // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
                    endpoint,
                    ...(params !== undefined ? { params } : {}),
                    retries: 3
                };
                const response = await nango.get<unknown>(proxyConfig);
                // A parse failure must throw here: silently skipping records in
                // a delete-tracked crawl would mark them as deleted.
                const page = DataverseListResponseSchema.parse(response.data);

                // Delete-tracked full crawl: the window opens only once the first page has
                // been fetched and parsed successfully, so a failure before any data is seen
                // never leaves it open.
                if (isFirstPage) {
                    await nango.trackDeletesStart('Opportunity');
                }
                isFirstPage = false;

                if (page.value.length > 0) {
                    await nango.batchSave(page.value.map(toOpportunity), 'Opportunity');
                    const lastRecord = page.value.at(-1);
                    if (lastRecord) {
                        lastSeenVersionNumber = lastRecord.versionnumber;
                    }
                }

                const nextLink = page['@odata.nextLink'];
                if (nextLink === undefined) {
                    hasNextPage = false;
                } else {
                    const nextUrl = new URL(nextLink);
                    endpoint = nextUrl.pathname + nextUrl.search;
                    params = undefined;
                }
            } while (hasNextPage);
        } else if (lastVersionNumber !== undefined) {
            // Incremental crawl: keyset-paginate changed records in $top-capped pages,
            // advancing the versionnumber cursor after each saved page. versionnumber is a
            // unique, monotonically increasing rowversion, so unlike modifiedon it never
            // ties across a page boundary and silently drops rows.
            let cursor = lastVersionNumber;
            let hasMore = true;

            do {
                // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
                const proxyConfig: ProxyConfiguration = {
                    // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
                    endpoint: '/api/data/v9.2/opportunities',
                    params: {
                        $select: SELECT_FIELDS,
                        $orderby: 'versionnumber asc',
                        $filter: `versionnumber gt ${cursor}`,
                        $top: PAGE_SIZE
                    },
                    retries: 3
                };
                const response = await nango.get<unknown>(proxyConfig);
                const page = DataverseListResponseSchema.parse(response.data);

                if (page.value.length > 0) {
                    await nango.batchSave(page.value.map(toOpportunity), 'Opportunity');
                    const lastRecord = page.value.at(-1);
                    if (lastRecord) {
                        cursor = lastRecord.versionnumber;
                        await nango.saveCheckpoint({
                            last_version_number: cursor,
                            last_full_refresh: previousFullRefresh ?? runStartedAt
                        });
                    }
                }

                hasMore = page.value.length === PAGE_SIZE;
            } while (hasMore);
        }

        if (isFullRefresh) {
            // The checkpoint is persisted only once the full scan completes: a
            // mid-scan crash must re-run as a delete-tracked full crawl rather
            // than looking like a finished incremental run.
            await nango.trackDeletesEnd('Opportunity');
            await nango.saveCheckpoint({
                last_version_number: lastSeenVersionNumber ?? lastVersionNumber ?? 0,
                last_full_refresh: runStartedAt
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
