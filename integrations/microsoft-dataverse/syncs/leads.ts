import { createSync } from 'nango';
import { z } from 'zod';

const PAGE_SIZE = 250;
const FULL_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

// Fields requested from the Dataverse Web API for each lead. Lookup columns are
// selected through their `_<logicalname>_value` representation, which returns the
// related record's GUID.
const LEAD_SELECT_FIELDS = [
    'leadid',
    'versionnumber',
    'subject',
    'firstname',
    'lastname',
    'fullname',
    'salutation',
    'emailaddress1',
    'telephone1',
    'mobilephone',
    'companyname',
    'jobtitle',
    'websiteurl',
    'address1_line1',
    'address1_city',
    'address1_stateorprovince',
    'address1_postalcode',
    'address1_country',
    'statecode',
    'statuscode',
    'leadsourcecode',
    'leadqualitycode',
    'estimatedvalue',
    'estimatedamount',
    'estimatedclosedate',
    'revenue',
    'numberofemployees',
    'description',
    'donotemail',
    'donotphone',
    'createdon',
    'modifiedon',
    '_ownerid_value',
    '_parentaccountid_value',
    '_parentcontactid_value',
    '_campaignid_value'
];

const LeadSchema = z
    .object({
        id: z.string().describe('Unique identifier of the lead (Dataverse leadid GUID). Example: "7ba18ae0-4d0e-ea11-a813-000d3a1bbd52"'),
        subject: z.string().optional().describe('Topic or title summarizing the lead. Example: "5 Cafe Grande Espresso Machines for A. Datum"'),
        firstname: z.string().optional().describe('First name of the lead contact. Example: "Gabriela"'),
        lastname: z.string().optional().describe('Last name of the lead contact. Example: "Christiansen"'),
        fullname: z.string().optional().describe('Full display name of the lead contact. Example: "Gabriela Christiansen"'),
        salutation: z.string().optional().describe('Salutation of the lead contact. Example: "Ms."'),
        emailaddress1: z.string().optional().describe('Primary email address of the lead. Example: "gabriela@adatum.com"'),
        telephone1: z.string().optional().describe('Primary business phone number of the lead. Example: "930-555-0168"'),
        mobilephone: z.string().optional().describe('Mobile phone number of the lead. Example: "930-555-0169"'),
        companyname: z.string().optional().describe('Company or organization the lead belongs to. Example: "A. Datum Corporation"'),
        jobtitle: z.string().optional().describe('Job title of the lead contact. Example: "Purchasing Manager"'),
        websiteurl: z.string().optional().describe('Website URL associated with the lead. Example: "http://www.adatum.com/"'),
        address1_line1: z.string().optional().describe('First line of the primary address. Example: "2345 Birchwood Dr"'),
        address1_city: z.string().optional().describe('City of the primary address. Example: "Redmond"'),
        address1_stateorprovince: z.string().optional().describe('State or province of the primary address. Example: "Washington"'),
        address1_postalcode: z.string().optional().describe('Postal code of the primary address. Example: "98101"'),
        address1_country: z.string().optional().describe('Country or region of the primary address. Example: "United States"'),
        statecode: z.number().optional().describe('State of the lead: 0 = Open, 1 = Qualified, 2 = Disqualified. Example: 0'),
        statuscode: z.number().optional().describe('Detailed status reason of the lead, interpreted relative to statecode. Example: 1'),
        leadsourcecode: z
            .number()
            .optional()
            .describe('Source of the lead as a Dataverse option set value (e.g. 1 = Advertisement, 3 = Web, 8 = Trade Show). Example: 7'),
        leadqualitycode: z.number().optional().describe('Quality rating of the lead: 1 = Hot, 2 = Warm, 3 = Cold. Example: 2'),
        estimatedvalue: z.number().optional().describe('Estimated value of the potential deal. Example: 15000'),
        estimatedamount: z.number().optional().describe('Estimated revenue amount of the lead in the transaction currency. Example: 25000'),
        estimatedclosedate: z
            .string()
            .optional()
            .describe('Estimated close date of the potential deal as an ISO 8601 timestamp. Example: "2026-12-31T00:00:00Z"'),
        revenue: z.number().optional().describe('Annual revenue of the lead company. Example: 25000000'),
        numberofemployees: z.number().optional().describe('Number of employees at the lead company. Example: 160'),
        description: z.string().optional().describe('Free-text description or notes about the lead'),
        donotemail: z.boolean().optional().describe('Whether the lead has opted out of email communication. Example: false'),
        donotphone: z.boolean().optional().describe('Whether the lead has opted out of phone communication. Example: false'),
        ownerid: z
            .string()
            .optional()
            .describe('GUID of the user or team that owns the lead (Dataverse ownerid lookup). Example: "1dbc2dba-9bb2-f111-aaac-000d3a3bd5b5"'),
        parentaccountid: z
            .string()
            .optional()
            .describe('GUID of the account this lead is linked to (Dataverse parentaccountid lookup). Example: "83883308-7ad5-ea11-a813-000d3a33f3b4"'),
        parentcontactid: z
            .string()
            .optional()
            .describe('GUID of the contact this lead is linked to (Dataverse parentcontactid lookup). Example: "8da18ae0-4d0e-ea11-a813-000d3a1bbd52"'),
        campaignid: z
            .string()
            .optional()
            .describe('GUID of the campaign that sourced this lead (Dataverse campaignid lookup). Example: "3fa18ae0-4d0e-ea11-a813-000d3a1bbd52"'),
        createdon: z.string().describe('Timestamp when the lead was created, ISO 8601 UTC. Example: "2026-09-18T19:43:07Z"'),
        modifiedon: z.string().describe('Timestamp when the lead was last modified, ISO 8601 UTC. Example: "2026-09-18T19:45:23Z"')
    })
    .describe('A Microsoft Dataverse lead (unqualified prospect)');

const CheckpointSchema = z.object({
    last_version_number: z
        .number()
        .describe(
            'Dataverse versionnumber high-water mark of the last synced lead. Incremental runs fetch only leads with versionnumber greater than this value. versionnumber is a unique, monotonically increasing rowversion, so unlike modifiedon it never ties across a page boundary. 0 when no lead has been seen yet.'
        ),
    last_full_refresh: z
        .string()
        .describe('ISO 8601 timestamp of the last completed delete-tracked full refresh. Empty string when no periodic full refresh has completed yet.')
});

const EMPTY_CHECKPOINT: z.infer<typeof CheckpointSchema> = {
    last_version_number: 0,
    last_full_refresh: ''
};

// Internal schema for parsing Dataverse Web API responses. Unset simple columns come
// back as explicit JSON null, hence nullish on every non-key field.
const DataverseLeadSchema = z.object({
    leadid: z.string(),
    versionnumber: z.number(),
    createdon: z.string(),
    modifiedon: z.string(),
    subject: z.string().nullish(),
    firstname: z.string().nullish(),
    lastname: z.string().nullish(),
    fullname: z.string().nullish(),
    salutation: z.string().nullish(),
    emailaddress1: z.string().nullish(),
    telephone1: z.string().nullish(),
    mobilephone: z.string().nullish(),
    companyname: z.string().nullish(),
    jobtitle: z.string().nullish(),
    websiteurl: z.string().nullish(),
    address1_line1: z.string().nullish(),
    address1_city: z.string().nullish(),
    address1_stateorprovince: z.string().nullish(),
    address1_postalcode: z.string().nullish(),
    address1_country: z.string().nullish(),
    statecode: z.number().nullish(),
    statuscode: z.number().nullish(),
    leadsourcecode: z.number().nullish(),
    leadqualitycode: z.number().nullish(),
    estimatedvalue: z.number().nullish(),
    estimatedamount: z.number().nullish(),
    estimatedclosedate: z.string().nullish(),
    revenue: z.number().nullish(),
    numberofemployees: z.number().nullish(),
    description: z.string().nullish(),
    donotemail: z.boolean().nullish(),
    donotphone: z.boolean().nullish(),
    _ownerid_value: z.string().nullish(),
    _parentaccountid_value: z.string().nullish(),
    _parentcontactid_value: z.string().nullish(),
    _campaignid_value: z.string().nullish()
});

const DataverseLeadListSchema = z.object({
    value: z.array(DataverseLeadSchema)
});

function toLead(record: z.infer<typeof DataverseLeadSchema>): z.infer<typeof LeadSchema> {
    return {
        id: record.leadid,
        createdon: record.createdon,
        modifiedon: record.modifiedon,
        ...(record.subject != null && { subject: record.subject }),
        ...(record.firstname != null && { firstname: record.firstname }),
        ...(record.lastname != null && { lastname: record.lastname }),
        ...(record.fullname != null && { fullname: record.fullname }),
        ...(record.salutation != null && { salutation: record.salutation }),
        ...(record.emailaddress1 != null && { emailaddress1: record.emailaddress1 }),
        ...(record.telephone1 != null && { telephone1: record.telephone1 }),
        ...(record.mobilephone != null && { mobilephone: record.mobilephone }),
        ...(record.companyname != null && { companyname: record.companyname }),
        ...(record.jobtitle != null && { jobtitle: record.jobtitle }),
        ...(record.websiteurl != null && { websiteurl: record.websiteurl }),
        ...(record.address1_line1 != null && { address1_line1: record.address1_line1 }),
        ...(record.address1_city != null && { address1_city: record.address1_city }),
        ...(record.address1_stateorprovince != null && { address1_stateorprovince: record.address1_stateorprovince }),
        ...(record.address1_postalcode != null && { address1_postalcode: record.address1_postalcode }),
        ...(record.address1_country != null && { address1_country: record.address1_country }),
        ...(record.statecode != null && { statecode: record.statecode }),
        ...(record.statuscode != null && { statuscode: record.statuscode }),
        ...(record.leadsourcecode != null && { leadsourcecode: record.leadsourcecode }),
        ...(record.leadqualitycode != null && { leadqualitycode: record.leadqualitycode }),
        ...(record.estimatedvalue != null && { estimatedvalue: record.estimatedvalue }),
        ...(record.estimatedamount != null && { estimatedamount: record.estimatedamount }),
        ...(record.estimatedclosedate != null && { estimatedclosedate: record.estimatedclosedate }),
        ...(record.revenue != null && { revenue: record.revenue }),
        ...(record.numberofemployees != null && { numberofemployees: record.numberofemployees }),
        ...(record.description != null && { description: record.description }),
        ...(record.donotemail != null && { donotemail: record.donotemail }),
        ...(record.donotphone != null && { donotphone: record.donotphone }),
        ...(record._ownerid_value != null && { ownerid: record._ownerid_value }),
        ...(record._parentaccountid_value != null && { parentaccountid: record._parentaccountid_value }),
        ...(record._parentcontactid_value != null && { parentcontactid: record._parentcontactid_value }),
        ...(record._campaignid_value != null && { campaignid: record._campaignid_value })
    };
}

const sync = createSync({
    description:
        'Sync leads (unqualified prospects) from Microsoft Dataverse, incrementally by versionnumber, with a periodic full refresh to detect deletions.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Lead: LeadSchema
    },

    exec: async (nango) => {
        const parsedCheckpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : EMPTY_CHECKPOINT;
        const lastFullRefreshMs = Date.parse(checkpoint.last_full_refresh);

        // The Dataverse Web API exposes no deleted-records feed, so deletion detection is
        // only possible on a full refresh, where the unfiltered walk sees every lead.
        // An incremental run must
        // never wrap its changed-only scan in trackDeletesStart/trackDeletesEnd: unchanged
        // leads would be absent from the scan and would be falsely deleted.
        const isFullRefresh = Number.isNaN(lastFullRefreshMs) || Date.now() - lastFullRefreshMs >= FULL_REFRESH_INTERVAL_MS;

        let watermark = isFullRefresh ? undefined : checkpoint.last_version_number || undefined;
        let hasMore = true;
        let isFirstPage = true;
        let deleteTrackingOpened = false;

        while (hasMore) {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
            const response = await nango.get<unknown>({
                endpoint: '/api/data/v9.2/leads',
                params: {
                    $select: LEAD_SELECT_FIELDS.join(','),
                    $orderby: 'versionnumber asc',
                    $top: PAGE_SIZE,
                    ...(watermark !== undefined && { $filter: `versionnumber gt ${watermark}` })
                },
                retries: 3
            });

            const page = DataverseLeadListSchema.parse(response.data).value;
            const lastRecord = page.at(-1);

            if (isFirstPage) {
                isFirstPage = false;
                // An empty first page of a full refresh is treated as inconclusive, not proof
                // the table is empty: opening (and later closing) delete tracking here would mark
                // every previously synced lead as deleted on what could be a transient or bogus
                // empty response. Bail out without touching delete tracking or the checkpoint, so
                // the next run retries the full refresh from scratch.
                if (lastRecord === undefined) {
                    break;
                }
                // Delete tracking opens only once the first page has been fetched, parsed, and
                // confirmed non-empty, so a failure or empty response before this point never
                // leaves the window open.
                if (isFullRefresh) {
                    await nango.trackDeletesStart('Lead');
                    deleteTrackingOpened = true;
                }
            }

            if (lastRecord === undefined) {
                break;
            }

            // versionnumber is a unique, monotonically increasing rowversion, so (unlike
            // modifiedon) keyset pagination on it can never tie across a page boundary and
            // silently drop the remaining leads of that page.
            await nango.batchSave(page.map(toLead), 'Lead');
            watermark = lastRecord.versionnumber;

            // Mid-scan checkpoints are only saved on incremental runs. A full refresh must
            // persist its checkpoint once the complete scan finishes, otherwise a crash
            // would make the retry look incremental and skip deletion detection.
            if (!isFullRefresh) {
                await nango.saveCheckpoint({
                    last_version_number: lastRecord.versionnumber,
                    last_full_refresh: checkpoint.last_full_refresh
                });
            }

            hasMore = page.length === PAGE_SIZE;
        }

        if (deleteTrackingOpened) {
            await nango.trackDeletesEnd('Lead');
            await nango.saveCheckpoint({
                last_version_number: watermark ?? checkpoint.last_version_number,
                last_full_refresh: new Date().toISOString()
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
