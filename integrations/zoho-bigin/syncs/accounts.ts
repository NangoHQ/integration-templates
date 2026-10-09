import { createSync } from 'nango';
import { z } from 'zod';

const ACCOUNTS_ENDPOINT = '/bigin/v2/Accounts';
const ACCOUNTS_SEARCH_ENDPOINT = '/bigin/v2/Accounts/search';
const PAGE_SIZE = 200;

// Bigin's list endpoint requires an explicit comma-separated `fields` list (max 50 fields).
const ACCOUNT_FIELDS =
    'id,Account_Name,Description,Website,Phone,Billing_Street,Billing_City,Billing_State,Billing_Code,Billing_Country,Created_Time,Modified_Time,Last_Activity_Time,Record_Image,Owner,Created_By,Modified_By,Tag,$currency_symbol,$editable,$followed,$sharing_permission,$approval_state';

// The `/search` index is eventually consistent (confirmed ~10-20s lag), so the incremental
// cursor is rewound by a safety margin to avoid missing recently written records.
const SEARCH_INDEX_LAG_MS = 15 * 60 * 1000;

// Bigin's `criteria` datetime parser rejects the ISO `Z` suffix and milliseconds; it expects
// an explicit numeric offset (e.g. "2026-10-08T20:45:00+00:00").
function toZohoDateTime(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

function shouldUseSavedPageToken(pageToken: string | undefined, pageTokenExpiry: string | undefined, now: Date): boolean {
    if (!pageToken) {
        return false;
    }

    if (!pageTokenExpiry) {
        return true;
    }

    const expiryMs = Date.parse(pageTokenExpiry);
    return Number.isNaN(expiryMs) || expiryMs > now.getTime();
}

// Bigin exposes no deleted-records endpoint, so deletions can only be detected by re-walking
// the full list with trackDeletes. A full scan is therefore re-run at this interval; between
// scans the cheaper (but deletion-blind) `/search` endpoint drives the incremental updates.
const FULL_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const ZohoUserSchema = z.object({
    name: z.string().nullable().optional(),
    id: z.string().nullable().optional(),
    email: z.string().nullable().optional()
});

const ZohoTagsSchema = z.object({
    name: z.string().nullable().optional(),
    id: z.string().nullable().optional()
});

// Shape of a single Account record returned by the Bigin Accounts list/search endpoints.
// Every field is nullable because Bigin renders unset fields as explicit JSON null.
const ZohoAccountSchema = z.object({
    id: z.string(),
    Account_Name: z.string().nullable().optional(),
    Description: z.string().nullable().optional(),
    Website: z.string().nullable().optional(),
    Phone: z.string().nullable().optional(),
    Billing_Street: z.string().nullable().optional(),
    Billing_City: z.string().nullable().optional(),
    Billing_State: z.string().nullable().optional(),
    Billing_Code: z.string().nullable().optional(),
    Billing_Country: z.string().nullable().optional(),
    Created_Time: z.string().nullable().optional(),
    Modified_Time: z.string().nullable().optional(),
    Last_Activity_Time: z.string().nullable().optional(),
    Record_Image: z.string().nullable().optional(),
    Owner: ZohoUserSchema.nullable().optional(),
    Created_By: ZohoUserSchema.nullable().optional(),
    Modified_By: ZohoUserSchema.nullable().optional(),
    Tag: z.array(ZohoTagsSchema).nullable().optional(),
    $currency_symbol: z.string().nullable().optional(),
    $editable: z.boolean().nullable().optional(),
    $followed: z.boolean().nullable().optional(),
    $sharing_permission: z.string().nullable().optional(),
    $approval_state: z.string().nullable().optional()
});

const ZohoInfoSchema = z.object({
    per_page: z.number().nullable().optional(),
    count: z.number().nullable().optional(),
    page: z.number().nullable().optional(),
    more_records: z.boolean().nullable().optional(),
    next_page_token: z.string().nullable().optional(),
    page_token_expiry: z.string().nullable().optional()
});

const ZohoAccountsResponseSchema = z.object({
    data: z.array(ZohoAccountSchema).nullable().optional(),
    info: ZohoInfoSchema.nullable().optional()
});

const AccountSchema = z
    .object({
        id: z.string().describe('Unique Bigin account record ID. Example: "2034020000000489159"'),
        accountName: z.string().optional().describe('Name of the company. Example: "Zylker Corp"'),
        description: z.string().optional().describe('Free-text description of the company'),
        website: z.string().optional().describe('Official website URL of the company. Example: "www.zylker.com"'),
        phone: z.string().optional().describe('Primary phone number of the company. Example: "+1 (555) 123-4567"'),
        billingStreet: z.string().optional().describe('Billing address street'),
        billingCity: z.string().optional().describe('Billing address city'),
        billingState: z.string().optional().describe('Billing address state or province'),
        billingCode: z.string().optional().describe('Billing address ZIP or postal code'),
        billingCountry: z.string().optional().describe('Billing address country'),
        createdTime: z.string().optional().describe('ISO 8601 timestamp when the account was created'),
        modifiedTime: z.string().optional().describe('ISO 8601 timestamp of the last account modification'),
        lastActivityTime: z.string().optional().describe('ISO 8601 timestamp of the last activity on the account'),
        recordImage: z.string().optional().describe('URL of the account image, when one is set'),
        ownerName: z.string().optional().describe('Display name of the account owner'),
        ownerId: z.string().optional().describe('Bigin user ID of the account owner'),
        ownerEmail: z.string().optional().describe('Email address of the account owner'),
        createdByName: z.string().optional().describe('Display name of the user who created the account'),
        createdById: z.string().optional().describe('Bigin user ID of the user who created the account'),
        createdByEmail: z.string().optional().describe('Email address of the user who created the account'),
        modifiedByName: z.string().optional().describe('Display name of the user who last modified the account'),
        modifiedById: z.string().optional().describe('Bigin user ID of the user who last modified the account'),
        modifiedByEmail: z.string().optional().describe('Email address of the user who last modified the account'),
        tags: z.array(z.string()).optional().describe('Names of the tags applied to the account'),
        currencySymbol: z.string().optional().describe('Currency symbol configured for the account. Example: "$"'),
        editable: z.boolean().optional().describe('Whether the account is editable by the connected user'),
        followed: z.boolean().optional().describe('Whether the connected user follows the account'),
        sharingPermission: z.string().optional().describe('Sharing permission level of the account. Example: "full_access"'),
        approvalState: z.string().optional().describe('Approval state of the account. Example: "approved"')
    })
    .describe('A company (account) record from Zoho Bigin');

const CheckpointSchema = z.object({
    updated_after: z.string(),
    last_full_refresh: z.string(),
    full_refresh_started_at: z.string(),
    full_refresh_page: z.number().int().nonnegative(),
    full_refresh_page_token: z.string(),
    full_refresh_page_token_expiry: z.string()
});

type Account = z.infer<typeof AccountSchema>;

function parseAccounts(response: { status: number; data: unknown }): {
    accounts: Account[];
    moreRecords: boolean;
    page: number | undefined;
    nextPageToken: string | undefined;
    pageTokenExpiry: string | undefined;
} {
    // Bigin signals "no records" with HTTP 204 and a completely empty body, never a 404 or an
    // empty JSON array, so a 204 must short-circuit before any body parsing is attempted.
    if (response.status === 204) {
        return { accounts: [], moreRecords: false, page: undefined, nextPageToken: undefined, pageTokenExpiry: undefined };
    }

    const parsed = ZohoAccountsResponseSchema.safeParse(response.data);
    if (!parsed.success) {
        throw new Error(`Failed to parse Bigin accounts response: ${parsed.error.message}`);
    }

    const records = parsed.data.data ?? [];
    return {
        accounts: records.map(mapAccount),
        moreRecords: parsed.data.info?.more_records ?? false,
        page: parsed.data.info?.page ?? undefined,
        nextPageToken: parsed.data.info?.next_page_token ?? undefined,
        pageTokenExpiry: parsed.data.info?.page_token_expiry ?? undefined
    };
}

function mapAccount(record: z.infer<typeof ZohoAccountSchema>): Account {
    return {
        id: record.id,
        accountName: record.Account_Name ?? undefined,
        description: record.Description ?? undefined,
        website: record.Website ?? undefined,
        phone: record.Phone ?? undefined,
        billingStreet: record.Billing_Street ?? undefined,
        billingCity: record.Billing_City ?? undefined,
        billingState: record.Billing_State ?? undefined,
        billingCode: record.Billing_Code ?? undefined,
        billingCountry: record.Billing_Country ?? undefined,
        createdTime: record.Created_Time ?? undefined,
        modifiedTime: record.Modified_Time ?? undefined,
        lastActivityTime: record.Last_Activity_Time ?? undefined,
        recordImage: record.Record_Image ?? undefined,
        ownerName: record.Owner?.name ?? undefined,
        ownerId: record.Owner?.id ?? undefined,
        ownerEmail: record.Owner?.email ?? undefined,
        createdByName: record.Created_By?.name ?? undefined,
        createdById: record.Created_By?.id ?? undefined,
        createdByEmail: record.Created_By?.email ?? undefined,
        modifiedByName: record.Modified_By?.name ?? undefined,
        modifiedById: record.Modified_By?.id ?? undefined,
        modifiedByEmail: record.Modified_By?.email ?? undefined,
        tags: record.Tag ? record.Tag.map((tag) => tag.name).filter((name): name is string => name !== null && name !== undefined) : undefined,
        currencySymbol: record.$currency_symbol ?? undefined,
        editable: record.$editable ?? undefined,
        followed: record.$followed ?? undefined,
        sharingPermission: record.$sharing_permission ?? undefined,
        approvalState: record.$approval_state ?? undefined
    };
}

// Incremental updates via the eventually-consistent `/search` endpoint. Returns the newest
// Modified_Time seen so the caller can advance its cursor (rewound on the next run).
async function syncIncrementalAccounts(nango: NangoSyncLocal, since: string): Promise<string | undefined> {
    let maxModifiedTime: string | undefined;
    let page = 1;

    while (true) {
        // https://www.bigin.com/developer/docs/apis/v2/search-records.html
        const response = await nango.get<unknown>({
            endpoint: ACCOUNTS_SEARCH_ENDPOINT,
            params: {
                criteria: `(Modified_Time:greater_than:${since})`,
                page,
                per_page: PAGE_SIZE
            },
            retries: 3
        });

        const { accounts, moreRecords } = parseAccounts(response);
        if (accounts.length > 0) {
            await nango.batchSave(accounts, 'Account');
            for (const account of accounts) {
                if (account.modifiedTime !== undefined && (maxModifiedTime === undefined || account.modifiedTime > maxModifiedTime)) {
                    maxModifiedTime = account.modifiedTime;
                }
            }
        }

        if (!moreRecords) {
            break;
        }
        page += 1;
    }

    return maxModifiedTime;
}

const sync = createSync({
    description: 'Sync all accounts (companies) in the Bigin org, incrementally where possible.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['ZohoBigin.modules.accounts.ALL'],
    checkpoint: CheckpointSchema,
    models: {
        Account: AccountSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse({
            updated_after: '',
            last_full_refresh: '',
            full_refresh_started_at: '',
            full_refresh_page: 0,
            full_refresh_page_token: '',
            full_refresh_page_token_expiry: '',
            ...((await nango.getCheckpoint()) ?? {})
        });
        const updatedAfter = checkpoint.updated_after !== '' ? checkpoint.updated_after : undefined;
        const lastFullRefresh = checkpoint.last_full_refresh !== '' ? checkpoint.last_full_refresh : undefined;
        const fullRefreshStartedAtCheckpoint = checkpoint.full_refresh_started_at !== '' ? checkpoint.full_refresh_started_at : undefined;
        const fullRefreshPage = checkpoint.full_refresh_page > 0 ? checkpoint.full_refresh_page : undefined;
        const fullRefreshPageToken = checkpoint.full_refresh_page_token !== '' ? checkpoint.full_refresh_page_token : undefined;
        const fullRefreshPageTokenExpiry = checkpoint.full_refresh_page_token_expiry !== '' ? checkpoint.full_refresh_page_token_expiry : undefined;
        const now = new Date();
        const fullRefreshInProgress = fullRefreshStartedAtCheckpoint !== undefined;
        const lastFullRefreshMs = lastFullRefresh ? Date.parse(lastFullRefresh) : Number.NaN;

        // A full list scan is the only reliable deletion-detection mechanism for Bigin (no
        // deleted-records endpoint exists), so it runs on the first execution and then at a
        // fixed cadence. Between scans the cheaper `/search` endpoint drives the updates.
        //
        // Confirmed provider gotcha: deleting an Account cascade-deletes every Contact
        // currently linked to it, so an account reported as deleted here may legitimately
        // explain a batch of contacts disappearing from the sibling `contacts` sync in the
        // same window. Consumers reconciling both syncs should treat those as one event.
        if (
            fullRefreshInProgress ||
            updatedAfter === undefined ||
            !Number.isFinite(lastFullRefreshMs) ||
            now.getTime() - lastFullRefreshMs >= FULL_REFRESH_INTERVAL_MS
        ) {
            // trackDeletesStart is placed here, after the checkpoint has been read successfully
            // and before any provider call, so a later failure never leaves an unclosed window.
            await nango.trackDeletesStart('Account');

            let fullRefreshStartedAt = fullRefreshStartedAtCheckpoint ?? now.toISOString();
            const usingSavedPageToken = shouldUseSavedPageToken(fullRefreshPageToken, fullRefreshPageTokenExpiry, now);
            let page = fullRefreshPage ?? 1;
            let pageToken = usingSavedPageToken ? fullRefreshPageToken : undefined;

            if (fullRefreshPageToken !== undefined && !usingSavedPageToken) {
                // Restart from page 1 when the provider's short-lived token has expired.
                fullRefreshStartedAt = now.toISOString();
                page = 1;
            }

            while (true) {
                // https://www.bigin.com/developer/docs/apis/v2/get-records.html
                const response = await nango.get<unknown>({
                    endpoint: ACCOUNTS_ENDPOINT,
                    params: {
                        fields: ACCOUNT_FIELDS,
                        per_page: PAGE_SIZE,
                        ...(pageToken ? { page_token: pageToken } : { page })
                    },
                    retries: 3
                });

                const { accounts, moreRecords, page: responsePage, nextPageToken, pageTokenExpiry } = parseAccounts(response);
                if (accounts.length > 0) {
                    await nango.batchSave(accounts, 'Account');
                }

                if (!moreRecords) {
                    break;
                }

                page = (responsePage ?? page) + 1;
                pageToken = nextPageToken ?? undefined;

                await nango.saveCheckpoint({
                    updated_after: updatedAfter ?? '',
                    last_full_refresh: lastFullRefresh ?? '',
                    full_refresh_started_at: fullRefreshStartedAt,
                    full_refresh_page: page,
                    full_refresh_page_token: pageToken ?? '',
                    full_refresh_page_token_expiry: pageTokenExpiry ?? ''
                });
            }

            // Clear the in-progress scan cursor before closing delete tracking so the end call
            // only runs once, on the execution that really finished the full dataset walk.
            await nango.clearCheckpoint();
            await nango.trackDeletesEnd('Account');
            await nango.saveCheckpoint({
                updated_after: fullRefreshStartedAt,
                last_full_refresh: new Date().toISOString(),
                full_refresh_started_at: '',
                full_refresh_page: 0,
                full_refresh_page_token: '',
                full_refresh_page_token_expiry: ''
            });
            return;
        }

        if (updatedAfter === undefined || lastFullRefresh === undefined) {
            throw new Error('Accounts incremental sync requires an existing updated_after and last_full_refresh checkpoint.');
        }

        // Incremental pass. `updatedAfter` is defined here because the full-refresh branch above
        // returns whenever it is missing. The `/search` index lags behind writes, so rewind the
        // cursor by a safety margin instead of using an exact, non-overlapping cutoff.
        const since = toZohoDateTime(new Date(new Date(updatedAfter).getTime() - SEARCH_INDEX_LAG_MS));
        const maxModifiedTime = await syncIncrementalAccounts(nango, since);

        await nango.saveCheckpoint({
            updated_after: maxModifiedTime ?? updatedAfter,
            last_full_refresh: lastFullRefresh,
            full_refresh_started_at: '',
            full_refresh_page: 0,
            full_refresh_page_token: '',
            full_refresh_page_token_expiry: ''
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
