import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PAGE_SIZE = 500;
const FULL_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const ContactSchema = z
    .object({
        id: z.string().describe('Unique identifier of the contact. Maps to the Dataverse `contactid` GUID.'),
        fullname: z.string().optional().describe('Full display name of the contact, e.g. "Haroun Stormonth".'),
        firstname: z.string().optional().describe('First (given) name of the contact.'),
        middlename: z.string().optional().describe('Middle name of the contact.'),
        lastname: z.string().optional().describe('Last (family) name of the contact.'),
        emailaddress1: z.string().optional().describe('Primary email address of the contact.'),
        telephone1: z.string().optional().describe('Primary business phone number of the contact.'),
        mobilephone: z.string().optional().describe('Mobile phone number of the contact.'),
        jobtitle: z.string().optional().describe('Job title of the contact, e.g. "Purchasing Manager".'),
        _parentcustomerid_value: z.string().optional().describe('GUID of the parent account (or parent contact) this contact is associated with.'),
        address1_line1: z.string().optional().describe('First line of the primary street address.'),
        address1_city: z.string().optional().describe('City of the primary address.'),
        address1_stateorprovince: z.string().optional().describe('State or province of the primary address.'),
        address1_postalcode: z.string().optional().describe('Postal code of the primary address.'),
        address1_country: z.string().optional().describe('Country or region of the primary address.'),
        statecode: z.number().optional().describe('Status of the contact: 0 = active, 1 = inactive.'),
        createdon: z.string().describe('ISO 8601 timestamp of when the contact was created, e.g. "2026-09-18T19:43:05Z".'),
        modifiedon: z.string().describe('ISO 8601 timestamp of when the contact was last modified, e.g. "2026-09-29T17:24:13Z".')
    })
    .describe('A Dataverse contact (person).');

// The Nango SDK requires checkpoint fields to be plain string/number/boolean schemas
// (non-optional), so empty string / 0 are used as "not set" sentinels.
const CheckpointSchema = z.object({
    last_version_number: z
        .number()
        .describe(
            'Dataverse `versionnumber` high-water mark of the last synced contact, used as the incremental filter cursor and to resume a crashed run exactly where it stopped. versionnumber is a unique, monotonically increasing rowversion, so unlike modifiedon it never ties across a page boundary or between runs. 0 when no contact has been synced yet.'
        ),
    last_full_refresh_at: z
        .string()
        .describe('ISO 8601 timestamp of when the last delete-detecting full refresh completed. Empty string when no full refresh has completed yet.')
});

// Internal schemas for parsing provider responses. Dataverse sometimes omits
// attributes with no value and sometimes returns them as an explicit null
// (confirmed live: middlename comes back as null), so nullish() is used for every
// non-key attribute and null is normalized to omission in the mapping below.
const DataverseContactSchema = z.object({
    contactid: z.string(),
    versionnumber: z.number(),
    fullname: z.string().nullish(),
    firstname: z.string().nullish(),
    middlename: z.string().nullish(),
    lastname: z.string().nullish(),
    emailaddress1: z.string().nullish(),
    telephone1: z.string().nullish(),
    mobilephone: z.string().nullish(),
    jobtitle: z.string().nullish(),
    _parentcustomerid_value: z.string().nullish(),
    address1_line1: z.string().nullish(),
    address1_city: z.string().nullish(),
    address1_stateorprovince: z.string().nullish(),
    address1_postalcode: z.string().nullish(),
    address1_country: z.string().nullish(),
    statecode: z.number().nullish(),
    createdon: z.string(),
    modifiedon: z.string()
});

const DataverseContactListSchema = z.object({
    value: z.array(DataverseContactSchema)
});

const sync = createSync({
    description: 'Sync contacts (people) from Microsoft Dataverse incrementally, with a periodic full refresh to detect deletions.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.nullish().parse(await nango.getCheckpoint()) ?? undefined;

        const now = new Date();
        const lastFullRefreshMs = checkpoint?.last_full_refresh_at ? Date.parse(checkpoint.last_full_refresh_at) : Number.NaN;
        // The Dataverse Web API exposes no deleted-records feed, so deletions are
        // detected by a full refresh on the first run and then once every 24 hours.
        const isFullRefresh = Number.isNaN(lastFullRefreshMs) || now.getTime() - lastFullRefreshMs > FULL_REFRESH_INTERVAL_MS;

        // `versionnumber` is a unique, monotonically increasing rowversion that changes on
        // every write in the same order as `modifiedon`, which makes it an exact tie-proof
        // keyset cursor: bulk-seeded or bulk-updated contacts routinely share the exact same
        // `modifiedon` (9 of the 12 sample contacts tie at the same second), and paginating
        // on `modifiedon` alone (with `$skip`/secondary sorts on `contactid` unsupported)
        // would silently skip tied rows both across a page boundary and across runs. A full
        // refresh always starts from the first page with no filter so unchanged rows are
        // seen and not falsely marked as deleted.
        let versionCursor: number | undefined = isFullRefresh ? undefined : checkpoint?.last_version_number || undefined;
        let maxVersionNumber: number | undefined;
        let hasMore = true;
        let isFirstPage = true;
        let deleteTrackingOpened = false;

        while (hasMore) {
            const proxyConfig: ProxyConfiguration = {
                // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
                endpoint: '/api/data/v9.2/contacts',
                params: {
                    ...(versionCursor !== undefined && { $filter: `versionnumber gt ${versionCursor}` }),
                    $orderby: 'versionnumber asc',
                    $top: PAGE_SIZE
                },
                retries: 3
            };
            const response = await nango.get(proxyConfig);
            // Throw on parse failure: skipping a record inside a delete-tracked scan
            // would falsely mark it as deleted.
            const rows = DataverseContactListSchema.parse(response.data).value;

            // Delete tracking opens only once the first page has been fetched, parsed, and
            // confirmed non-empty, so a failure or empty response before this point never leaves
            // the window open. An empty first page of a full refresh is treated as inconclusive,
            // not proof the table is empty, since acting on it would mark every previously synced
            // contact as deleted.
            if (isFirstPage && isFullRefresh && rows.length > 0) {
                await nango.trackDeletesStart('Contact');
                deleteTrackingOpened = true;
            }
            isFirstPage = false;

            if (rows.length > 0) {
                const contacts = rows.map((row) => ({
                    id: row.contactid,
                    createdon: row.createdon,
                    modifiedon: row.modifiedon,
                    ...(row.fullname != null && { fullname: row.fullname }),
                    ...(row.firstname != null && { firstname: row.firstname }),
                    ...(row.middlename != null && { middlename: row.middlename }),
                    ...(row.lastname != null && { lastname: row.lastname }),
                    ...(row.emailaddress1 != null && { emailaddress1: row.emailaddress1 }),
                    ...(row.telephone1 != null && { telephone1: row.telephone1 }),
                    ...(row.mobilephone != null && { mobilephone: row.mobilephone }),
                    ...(row.jobtitle != null && { jobtitle: row.jobtitle }),
                    ...(row._parentcustomerid_value != null && { _parentcustomerid_value: row._parentcustomerid_value }),
                    ...(row.address1_line1 != null && { address1_line1: row.address1_line1 }),
                    ...(row.address1_city != null && { address1_city: row.address1_city }),
                    ...(row.address1_stateorprovince != null && { address1_stateorprovince: row.address1_stateorprovince }),
                    ...(row.address1_postalcode != null && { address1_postalcode: row.address1_postalcode }),
                    ...(row.address1_country != null && { address1_country: row.address1_country }),
                    ...(row.statecode != null && { statecode: row.statecode })
                }));

                await nango.batchSave(contacts, 'Contact');

                const lastRow = rows[rows.length - 1];
                if (lastRow) {
                    versionCursor = lastRow.versionnumber;
                    maxVersionNumber = lastRow.versionnumber;

                    if (!isFullRefresh) {
                        // Mid-scan checkpoint on a plain incremental run, so a crashed run
                        // resumes exactly after the last saved row.
                        await nango.saveCheckpoint({
                            last_version_number: lastRow.versionnumber,
                            last_full_refresh_at: checkpoint?.last_full_refresh_at ?? ''
                        });
                    }
                }
            }

            hasMore = rows.length === PAGE_SIZE;
        }

        if (deleteTrackingOpened) {
            await nango.trackDeletesEnd('Contact');
        }

        // Completion checkpoint: advance the versionnumber watermark. Never reset it to 0 -
        // doing so would let the next run's filter regress and re-skip any contact written
        // with the same versionnumber floor. For a full refresh this is saved only after
        // trackDeletesEnd, so a crash mid-scan (or an empty first page that never opened
        // tracking) makes the next run redo the full refresh instead of resuming as a plain
        // incremental that would silently skip delete tracking.
        await nango.saveCheckpoint({
            last_version_number: maxVersionNumber ?? checkpoint?.last_version_number ?? 0,
            last_full_refresh_at: deleteTrackingOpened ? now.toISOString() : (checkpoint?.last_full_refresh_at ?? '')
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
