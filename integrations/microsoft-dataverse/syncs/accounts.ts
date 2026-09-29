import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const AccountSchema = z
    .object({
        id: z.string().describe('Unique identifier of the account (Dataverse accountid GUID). Example: 88cea450-cb0c-ea11-a813-000d3a1b1223'),
        createdon: z.string().describe('ISO 8601 timestamp of when the account record was created. Example: 2026-09-18T19:43:05Z'),
        modifiedon: z.string().describe('ISO 8601 timestamp of when the account record was last modified. Example: 2026-09-18T19:46:58Z'),
        name: z.string().optional().describe('Primary name of the account. Example: Fabrikam, Inc.'),
        accountnumber: z.string().optional().describe('Account number or code for the account. Example: ABSS4G45'),
        description: z.string().optional().describe('Free-text description of the account.'),
        websiteurl: z.string().optional().describe('Website URL of the account. Example: http://www.fabrikaminc.com'),
        emailaddress1: z.string().optional().describe('Primary email address of the account. Example: info@fabrikam.com'),
        telephone1: z.string().optional().describe('Primary phone number of the account. Example: 423-555-0103'),
        fax: z.string().optional().describe('Fax number of the account. Example: 423-555-0104'),
        sic: z.string().optional().describe('Standard Industrial Classification (SIC) code of the account. Example: 5099'),
        tickersymbol: z.string().optional().describe('Stock ticker symbol of the account. Example: FBKMZ'),
        industrycode: z.number().optional().describe('Industry option-set value of the account (integer; see the industrycode PicklistMetadata for labels).'),
        numberofemployees: z.number().optional().describe('Number of employees at the account. Example: 50'),
        revenue: z.number().optional().describe('Annual revenue of the account in the transaction currency. Example: 8000000'),
        creditlimit: z.number().optional().describe('Credit limit of the account in the transaction currency. Example: 75000'),
        address1_line1: z.string().optional().describe('First line of the primary address. Example: 6789 Edwards Ave.'),
        address1_line2: z.string().optional().describe('Second line of the primary address.'),
        address1_line3: z.string().optional().describe('Third line of the primary address.'),
        address1_city: z.string().optional().describe('City of the primary address. Example: Lynnwood'),
        address1_stateorprovince: z.string().optional().describe('State or province of the primary address. Example: Tennessee'),
        address1_postalcode: z.string().optional().describe('Postal code of the primary address. Example: 37010'),
        address1_country: z.string().optional().describe('Country or region of the primary address. Example: United States'),
        statecode: z.number().optional().describe('State of the account record: 0 = Active, 1 = Inactive.'),
        statuscode: z.number().optional().describe('Status reason option-set value of the account record (integer; 1 = Active, 2 = Inactive).'),
        _ownerid_value: z.string().optional().describe('GUID of the user or team that owns the account. Example: 1dbc2dba-9bb2-f111-aaac-000d3a3bd5b5'),
        _parentaccountid_value: z
            .string()
            .optional()
            .describe('GUID of the parent account, when the account is a subsidiary. Example: 88cea450-cb0c-ea11-a813-000d3a1b1223'),
        _primarycontactid_value: z
            .string()
            .optional()
            .describe('GUID of the primary contact associated with the account. Example: cdd6a450-cb0c-ea11-a813-000d3a1b1223')
    })
    .describe('Microsoft Dataverse account (company/organization) record.');

// Checkpoint fields must be plain required primitives (z.ZodString | z.ZodNumber | z.ZodBoolean),
// so both values are always persisted together once at least one account has been seen.
const CheckpointSchema = z.object({
    lastVersionNumber: z
        .number()
        .describe(
            'Dataverse versionnumber of the last-synced account; used as a tie-safe exclusive lower bound ($filter=versionnumber gt ...) for the next incremental run. versionnumber is a unique, monotonically increasing rowversion, unlike modifiedon which multiple accounts can share.'
        ),
    lastFullSync: z
        .string()
        .describe(
            'ISO 8601 timestamp of the last completed full unfiltered crawl used for delete detection; a new full crawl runs when this is missing or older than the full-refresh interval.'
        )
});

// Internal schemas used to parse the Dataverse Web API response envelope.
const DataverseAccountSchema = z.object({
    accountid: z.string(),
    versionnumber: z.number(),
    createdon: z.string(),
    modifiedon: z.string(),
    name: z.string().nullable().optional(),
    accountnumber: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    websiteurl: z.string().nullable().optional(),
    emailaddress1: z.string().nullable().optional(),
    telephone1: z.string().nullable().optional(),
    fax: z.string().nullable().optional(),
    sic: z.string().nullable().optional(),
    tickersymbol: z.string().nullable().optional(),
    industrycode: z.number().nullable().optional(),
    numberofemployees: z.number().nullable().optional(),
    revenue: z.number().nullable().optional(),
    creditlimit: z.number().nullable().optional(),
    address1_line1: z.string().nullable().optional(),
    address1_line2: z.string().nullable().optional(),
    address1_line3: z.string().nullable().optional(),
    address1_city: z.string().nullable().optional(),
    address1_stateorprovince: z.string().nullable().optional(),
    address1_postalcode: z.string().nullable().optional(),
    address1_country: z.string().nullable().optional(),
    statecode: z.number().nullable().optional(),
    statuscode: z.number().nullable().optional(),
    _ownerid_value: z.string().nullable().optional(),
    _parentaccountid_value: z.string().nullable().optional(),
    _primarycontactid_value: z.string().nullable().optional()
});

const DataverseAccountPageSchema = z.object({
    value: z.array(DataverseAccountSchema)
});

type Account = z.infer<typeof AccountSchema>;

function toAccount(record: z.infer<typeof DataverseAccountSchema>): Account {
    return {
        id: record.accountid,
        createdon: record.createdon,
        modifiedon: record.modifiedon,
        ...(record.name != null && { name: record.name }),
        ...(record.accountnumber != null && { accountnumber: record.accountnumber }),
        ...(record.description != null && { description: record.description }),
        ...(record.websiteurl != null && { websiteurl: record.websiteurl }),
        ...(record.emailaddress1 != null && { emailaddress1: record.emailaddress1 }),
        ...(record.telephone1 != null && { telephone1: record.telephone1 }),
        ...(record.fax != null && { fax: record.fax }),
        ...(record.sic != null && { sic: record.sic }),
        ...(record.tickersymbol != null && { tickersymbol: record.tickersymbol }),
        ...(record.industrycode != null && { industrycode: record.industrycode }),
        ...(record.numberofemployees != null && { numberofemployees: record.numberofemployees }),
        ...(record.revenue != null && { revenue: record.revenue }),
        ...(record.creditlimit != null && { creditlimit: record.creditlimit }),
        ...(record.address1_line1 != null && { address1_line1: record.address1_line1 }),
        ...(record.address1_line2 != null && { address1_line2: record.address1_line2 }),
        ...(record.address1_line3 != null && { address1_line3: record.address1_line3 }),
        ...(record.address1_city != null && { address1_city: record.address1_city }),
        ...(record.address1_stateorprovince != null && { address1_stateorprovince: record.address1_stateorprovince }),
        ...(record.address1_postalcode != null && { address1_postalcode: record.address1_postalcode }),
        ...(record.address1_country != null && { address1_country: record.address1_country }),
        ...(record.statecode != null && { statecode: record.statecode }),
        ...(record.statuscode != null && { statuscode: record.statuscode }),
        ...(record._ownerid_value != null && { _ownerid_value: record._ownerid_value }),
        ...(record._parentaccountid_value != null && { _parentaccountid_value: record._parentaccountid_value }),
        ...(record._primarycontactid_value != null && { _primarycontactid_value: record._primarycontactid_value })
    };
}

const PAGE_SIZE = 250;
const FULL_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const sync = createSync({
    description: 'Sync accounts (companies/organizations) from Microsoft Dataverse, incrementally, with a periodic full refresh to detect deletions.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Account: AccountSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const startedAt = new Date().toISOString();
        const isFullRefresh = !checkpoint || Date.now() - Date.parse(checkpoint.lastFullSync) >= FULL_REFRESH_INTERVAL_MS;

        // Dataverse caps results at $top without returning @odata.nextLink, so nango.paginate link mode
        // would silently truncate the dataset. Paginate manually instead: order by versionnumber ascending
        // and advance the exclusive versionnumber lower bound after every page (keyset pagination).
        // versionnumber is a unique, monotonically increasing rowversion, so unlike modifiedon it can
        // never tie across a page boundary and silently drop the remaining rows of that page.
        // Full refreshes always start from the beginning of the dataset (no $filter).
        let versionAfter = isFullRefresh ? undefined : checkpoint?.lastVersionNumber;
        let latestVersionNumber: number | undefined;
        let hasMore = true;
        let isFirstPage = true;

        while (hasMore) {
            const proxyConfig: ProxyConfiguration = {
                // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
                endpoint: '/api/data/v9.2/accounts',
                params: {
                    $orderby: 'versionnumber asc',
                    $top: PAGE_SIZE,
                    ...(versionAfter !== undefined && { $filter: `versionnumber gt ${versionAfter}` })
                },
                retries: 3
            };
            const response = await nango.get<unknown>(proxyConfig);
            const page = DataverseAccountPageSchema.parse(response.data);

            // Delete tracking opens only once the first page has been fetched and parsed
            // successfully, so a failure before any data is seen never leaves the window open.
            if (isFirstPage && isFullRefresh) {
                await nango.trackDeletesStart('Account');
            }
            isFirstPage = false;

            const accounts = page.value.map(toAccount);

            if (accounts.length > 0) {
                await nango.batchSave(accounts, 'Account');
                const lastRecord = page.value[page.value.length - 1];
                if (lastRecord) {
                    latestVersionNumber = lastRecord.versionnumber;
                    versionAfter = lastRecord.versionnumber;
                    if (!isFullRefresh) {
                        // Incremental run: checkpoint exists (a full refresh ran before), so persist
                        // progress after every page; startedAt is only an unreachable fallback.
                        await nango.saveCheckpoint({
                            lastVersionNumber: lastRecord.versionnumber,
                            lastFullSync: checkpoint?.lastFullSync ?? startedAt
                        });
                    }
                }
            }

            hasMore = page.value.length === PAGE_SIZE;
        }

        if (isFullRefresh) {
            await nango.trackDeletesEnd('Account');
            // Persist the checkpoint only once the full scan has completed: saving it mid-scan would make
            // a crashed run look like a plain incremental run on retry and skip delete tracking.
            // When no account was seen at all there is no versionnumber floor to persist, so the next run
            // simply performs another full refresh.
            const resumeAfter = latestVersionNumber ?? checkpoint?.lastVersionNumber;
            if (resumeAfter !== undefined) {
                await nango.saveCheckpoint({
                    lastVersionNumber: resumeAfter,
                    lastFullSync: startedAt
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
