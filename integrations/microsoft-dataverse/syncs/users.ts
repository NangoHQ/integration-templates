import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PAGE_SIZE = 100;
const FULL_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // weekly

const UserSchema = z
    .object({
        id: z.string().describe('Unique identifier of the system user (the systemuserid GUID), e.g. "6c3b2c4f-1234-4f5a-8b9c-0d1e2f3a4b5c".'),
        fullname: z.string().optional().describe('Full display name of the user, e.g. "Ada Lovelace". Omitted when null upstream.'),
        firstname: z.string().optional().describe('First name of the user. Omitted when null upstream.'),
        lastname: z.string().optional().describe('Last name of the user. Omitted when null upstream.'),
        internalemailaddress: z
            .string()
            .optional()
            .describe('Primary internal email address of the user, e.g. "ada@fabrikam.com". Omitted when null upstream.'),
        domainname: z.string().optional().describe('Sign-in name of the user (domain\\username or UPN). Omitted when null upstream.'),
        title: z.string().optional().describe('Job title of the user, e.g. "Sales Manager". Omitted when null upstream.'),
        applicationid: z
            .string()
            .optional()
            .describe('Entra ID application (client) ID when this identity is an application user. Omitted for interactive users.'),
        isdisabled: z.boolean().optional().describe('Whether the user account is disabled. Dataverse typically disables users instead of hard-deleting them.'),
        islicensed: z.boolean().optional().describe('Whether the user is licensed in the tenant.'),
        createdon: z.string().describe('ISO 8601 UTC timestamp of when the user record was created, e.g. "2026-09-29T15:49:54Z".'),
        modifiedon: z.string().describe('ISO 8601 UTC timestamp of when the user record was last modified; used as the incremental sync cursor.')
    })
    .describe('A Microsoft Dataverse system user (systemuser entity). Users are rarely hard-deleted; they are typically disabled via isdisabled instead.');

// Checkpoint fields must be non-optional: the SDK's ZodCheckpoint constraint only accepts plain string/number/boolean fields.
const CheckpointSchema = z.object({
    modified_after: z
        .string()
        .describe(
            'ISO 8601 UTC high-water mark: the greatest modifiedon timestamp saved so far. Incremental runs fetch only records with modifiedon after this value.'
        ),
    last_full_sync: z
        .string()
        .describe(
            'ISO 8601 UTC timestamp of the last completed delete-tracked full refresh. A new full refresh runs when this is older than the full refresh interval.'
        )
});

// Internal schema for the provider payload; only the fields mapped into the model are listed (unknown attributes are stripped).
// Null-valued attributes are omitted entirely from fetchXml responses, and may be explicit null in plain OData responses.
const SystemUserRecordSchema = z.object({
    systemuserid: z.string(),
    fullname: z.string().nullable().optional(),
    firstname: z.string().nullable().optional(),
    lastname: z.string().nullable().optional(),
    internalemailaddress: z.string().nullable().optional(),
    domainname: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    applicationid: z.string().nullable().optional(),
    isdisabled: z.boolean().nullable().optional(),
    islicensed: z.boolean().nullable().optional(),
    createdon: z.string(),
    modifiedon: z.string()
});

const SystemUserListResponseSchema = z.object({
    value: z.array(SystemUserRecordSchema),
    '@Microsoft.Dynamics.CRM.fetchxmlpagingcookie': z.string().optional()
});

type SystemUserRecord = z.infer<typeof SystemUserRecordSchema>;

const FETCH_ATTRIBUTES = [
    'systemuserid',
    'fullname',
    'firstname',
    'lastname',
    'internalemailaddress',
    'domainname',
    'title',
    'applicationid',
    'isdisabled',
    'islicensed',
    'createdon',
    'modifiedon'
]
    .map((name) => `<attribute name="${name}"/>`)
    .join('');

function escapeXmlAttribute(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildFetchXml(page: number, pagingCookie: string | undefined, modifiedAfter: string | undefined): string {
    const cookieAttribute = pagingCookie === undefined ? '' : ` paging-cookie="${escapeXmlAttribute(pagingCookie)}"`;
    const filter =
        modifiedAfter === undefined
            ? ''
            : `<filter type="and"><condition attribute="modifiedon" operator="gt" value="${escapeXmlAttribute(modifiedAfter)}"/></filter>`;
    return `<fetch page="${page}" count="${PAGE_SIZE}"${cookieAttribute}><entity name="systemuser">${FETCH_ATTRIBUTES}<order attribute="modifiedon" descending="false"/>${filter}</entity></fetch>`;
}

// The paging cookie arrives URL-encoded through the proxy (double-encoded in practice); decode the inner
// cookie XML until it is plain markup so it can be embedded into the next fetchXml document.
function decodePagingCookie(rawCookie: string): string | undefined {
    const match = /pagingcookie="([^"]*)"/.exec(rawCookie);
    const encoded = match?.[1];
    if (encoded === undefined) {
        return undefined;
    }
    let value = encoded;
    for (let attempt = 0; attempt < 3 && !value.startsWith('<') && value.includes('%'); attempt++) {
        value = decodeURIComponent(value);
    }
    return value.startsWith('<') ? value : undefined;
}

function toUser(record: SystemUserRecord) {
    return {
        id: record.systemuserid,
        ...(record.fullname != null && { fullname: record.fullname }),
        ...(record.firstname != null && { firstname: record.firstname }),
        ...(record.lastname != null && { lastname: record.lastname }),
        ...(record.internalemailaddress != null && { internalemailaddress: record.internalemailaddress }),
        ...(record.domainname != null && { domainname: record.domainname }),
        ...(record.title != null && { title: record.title }),
        ...(record.applicationid != null && { applicationid: record.applicationid }),
        ...(record.isdisabled != null && { isdisabled: record.isdisabled }),
        ...(record.islicensed != null && { islicensed: record.islicensed }),
        createdon: record.createdon,
        modifiedon: record.modifiedon
    };
}

const sync = createSync({
    description: 'Incrementally sync Microsoft Dataverse system users (systemusers), with a weekly full refresh to detect hard-deleted users.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
        // A missing or unparseable checkpoint falls back to a full refresh instead of crashing.
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : null;
        const isFullRefresh = checkpoint === null || Date.now() - new Date(checkpoint.last_full_sync).getTime() >= FULL_REFRESH_INTERVAL_MS;

        if (isFullRefresh) {
            // The full refresh crawl is intentionally unfiltered: trackDeletesEnd would falsely
            // delete unchanged users if a changed-only modifiedon filter were applied here.
            await nango.trackDeletesStart('User');
        }

        let maxModifiedOn: string | undefined = checkpoint?.modified_after;
        let page = 1;
        let pagingCookie: string | undefined;
        let hasMorePages = true;

        // Paging uses fetchXml page/count with a paging cookie: verified live that this endpoint never
        // emits @odata.nextLink for $top-capped OData queries (Prefer: odata.maxpagesize is ignored too)
        // and that $skip silently returns zero rows, so the fetchXml paging cookie is the only working
        // pagination mechanism here.
        while (hasMorePages) {
            const config: ProxyConfiguration = {
                // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
                // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/overview
                endpoint: '/api/data/v9.2/systemusers',
                params: {
                    fetchXml: buildFetchXml(page, pagingCookie, isFullRefresh || checkpoint === null ? undefined : checkpoint.modified_after)
                },
                retries: 3
            };
            const response = await nango.get(config);
            // Throwing on parse failure is intentional: in the delete-tracked full refresh a skipped
            // record would be falsely marked as deleted.
            const parsed = SystemUserListResponseSchema.parse(response.data);

            if (parsed.value.length > 0) {
                const users = parsed.value.map(toUser);
                await nango.batchSave(users, 'User');
                const lastUser = users[users.length - 1];
                if (lastUser !== undefined) {
                    maxModifiedOn = lastUser.modifiedon;
                }
                // Incremental runs checkpoint the last-seen modifiedon after every page. The
                // delete-tracked full refresh persists progress only once, after the whole scan.
                if (!isFullRefresh && checkpoint !== null && maxModifiedOn !== undefined) {
                    await nango.saveCheckpoint({ modified_after: maxModifiedOn, last_full_sync: checkpoint.last_full_sync });
                }
            }

            const rawCookie = parsed['@Microsoft.Dynamics.CRM.fetchxmlpagingcookie'];
            if (rawCookie === undefined || parsed.value.length === 0) {
                hasMorePages = false;
            } else {
                const decodedCookie = decodePagingCookie(rawCookie);
                if (decodedCookie === undefined) {
                    // Unexpected cookie shape: fail loudly instead of guessing a pagination state that
                    // could skip records (which a full refresh would then falsely mark as deleted).
                    throw new Error('Unable to decode the Dataverse fetchXml paging cookie');
                }
                pagingCookie = decodedCookie;
                page += 1;
            }
        }

        if (isFullRefresh) {
            await nango.trackDeletesEnd('User');
            await nango.saveCheckpoint({ modified_after: maxModifiedOn ?? new Date().toISOString(), last_full_sync: new Date().toISOString() });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
