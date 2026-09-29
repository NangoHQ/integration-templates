import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

/**
 * Dataverse Web API behaviors verified live against the seeded sandbox org that shaped this sync:
 * - Lookup values come back as `_<lookupLogicalName>_value` properties and must be requested in
 *   `$select` in that form (selecting the lookup's logical name returns no value for Customer/Lookup
 *   types). Empty fields come back as explicit JSON nulls, hence the `.nullable()` raw fields below.
 * - `$top` caps the WHOLE result set and suppresses `@odata.nextLink` (verified live: 12 contacts
 *   with `$top=2` returned 2 rows and no nextLink) and `$skip` is unsupported. To page safely, this
 *   sync re-issues the same query with an advanced `modifiedon gt <last seen>` window until a short
 *   page comes back, checkpointing the last-seen `modifiedon` per page.
 * - Records that share an identical `modifiedon` second across a page boundary could be skipped by
 *   the `gt` window; the periodic delete-tracked full refresh below also serves as the safety net
 *   that re-fetches the complete dataset.
 */

const PAGE_SIZE = 500;
const FULL_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const INCIDENT_SELECT_FIELDS = [
    'incidentid',
    'versionnumber',
    'ticketnumber',
    'title',
    'description',
    'prioritycode',
    'severitycode',
    'statecode',
    'statuscode',
    'caseorigincode',
    'casetypecode',
    'customersatisfactioncode',
    '_customerid_value',
    '_primarycontactid_value',
    '_parentcaseid_value',
    '_ownerid_value',
    '_subjectid_value',
    'isescalated',
    'escalatedon',
    'resolveby',
    'responseby',
    'firstresponsesent',
    'firstresponseslastatus',
    'resolvebyslastatus',
    'followupby',
    'servicestage',
    'stageid',
    'processid',
    'onholdtime',
    'lastonholdtime',
    'blockedprofile',
    'createdon',
    '_createdby_value',
    'modifiedon',
    '_modifiedby_value'
].join(',');

// Raw shape of one incident row as returned by the Dataverse Web API (internal; no descriptions).
const RawIncidentSchema = z.object({
    incidentid: z.string(),
    versionnumber: z.number(),
    ticketnumber: z.string().nullable(),
    title: z.string().nullable(),
    description: z.string().nullable(),
    prioritycode: z.number().nullable(),
    severitycode: z.number().nullable(),
    statecode: z.number().nullable(),
    statuscode: z.number().nullable(),
    caseorigincode: z.number().nullable(),
    casetypecode: z.number().nullable(),
    customersatisfactioncode: z.number().nullable(),
    _customerid_value: z.string().nullable(),
    _primarycontactid_value: z.string().nullable(),
    _parentcaseid_value: z.string().nullable(),
    _ownerid_value: z.string().nullable(),
    _subjectid_value: z.string().nullable(),
    isescalated: z.boolean().nullable(),
    escalatedon: z.string().nullable(),
    resolveby: z.string().nullable(),
    responseby: z.string().nullable(),
    firstresponsesent: z.boolean().nullable(),
    firstresponseslastatus: z.number().nullable(),
    resolvebyslastatus: z.number().nullable(),
    followupby: z.string().nullable(),
    servicestage: z.number().nullable(),
    stageid: z.string().nullable(),
    processid: z.string().nullable(),
    onholdtime: z.number().nullable(),
    lastonholdtime: z.string().nullable(),
    blockedprofile: z.boolean().nullable(),
    createdon: z.string(),
    _createdby_value: z.string().nullable(),
    modifiedon: z.string(),
    _modifiedby_value: z.string().nullable()
});

const RawIncidentsResponseSchema = z.object({
    value: z.array(RawIncidentSchema)
});

const CaseSchema = z
    .object({
        id: z.string().describe('Unique identifier of the case (Dataverse incidentid GUID), e.g. "a57a1a6d-2bbc-f111-aaad-7ced8d717fa5"'),
        ticketnumber: z.string().optional().describe('Auto-generated human-readable case number, e.g. "CAS-01011-P9T3T1"'),
        title: z.string().optional().describe('Short summary of the case (primary name of the incident record)'),
        description: z.string().optional().describe('Detailed description of the customer issue'),
        prioritycode: z.number().optional().describe('Priority option set value: 1 = High, 2 = Normal, 3 = Low'),
        severitycode: z.number().optional().describe('Severity option set value (1 = Default Value in the standard option set)'),
        statecode: z.number().optional().describe('Lifecycle state option set value: 0 = Active, 1 = Resolved, 2 = Cancelled'),
        statuscode: z.number().optional().describe('Status reason option set value for the current state, e.g. 1 = In Progress, 5 = Problem Solved'),
        caseorigincode: z
            .number()
            .optional()
            .describe('Channel the case originated from: 1 = Phone, 2 = Email, 3 = Web, 2483 = Facebook, 3986 = Twitter, 700610000 = IoT'),
        casetypecode: z.number().optional().describe('Case type option set value: 1 = Question, 2 = Problem, 3 = Request'),
        customersatisfactioncode: z
            .number()
            .optional()
            .describe('Customer satisfaction option set value: 5 = Very Satisfied, 4 = Satisfied, 3 = Neutral, 2 = Dissatisfied, 1 = Very Dissatisfied'),
        customer_id: z
            .string()
            .optional()
            .describe('GUID of the customer the case belongs to; can reference either an account or a contact (Dataverse customer lookup)'),
        primarycontact_id: z.string().optional().describe('GUID of the primary contact (contact record) for the case'),
        parentcase_id: z.string().optional().describe('GUID of the parent case when this case is a child case'),
        owner_id: z.string().optional().describe('GUID of the owner (systemuser or team) the case is assigned to'),
        subject_id: z.string().optional().describe('GUID of the subject used to categorize the case'),
        isescalated: z.boolean().optional().describe('Whether the case has been escalated'),
        escalatedon: z.string().optional().describe('ISO 8601 timestamp of when the case was escalated, e.g. "2026-09-29T17:30:15Z"'),
        resolveby: z.string().optional().describe('ISO 8601 SLA deadline by which the case should be resolved'),
        responseby: z.string().optional().describe('ISO 8601 SLA deadline by which a first response should be sent'),
        firstresponsesent: z.boolean().optional().describe('Whether a first response has been sent for the case'),
        firstresponseslastatus: z
            .number()
            .optional()
            .describe('First-response SLA status: 1 = In Progress, 2 = Nearing Noncompliance, 3 = Succeeded, 4 = Noncompliant'),
        resolvebyslastatus: z
            .number()
            .optional()
            .describe('Resolve-by SLA status: 1 = In Progress, 2 = Nearing Noncompliance, 3 = Succeeded, 4 = Noncompliant'),
        followupby: z.string().optional().describe('ISO 8601 timestamp by which a follow-up with the customer is planned'),
        servicestage: z.number().optional().describe('Service stage option set value: 0 = Identify, 1 = Research, 2 = Resolve'),
        stageid: z.string().optional().describe('GUID of the current business process flow stage the case is in'),
        processid: z.string().optional().describe('GUID of the business process flow associated with the case'),
        onholdtime: z.number().optional().describe('Total minutes the case has been on hold'),
        lastonholdtime: z.string().optional().describe('ISO 8601 timestamp of when the case was last put on hold'),
        blockedprofile: z.boolean().optional().describe('Whether the customer is blocked from being contacted (blocked profile)'),
        createdon: z.string().describe('ISO 8601 timestamp of when the case was created, e.g. "2026-09-29T17:30:15Z"'),
        createdby_id: z.string().optional().describe('GUID of the systemuser who created the case'),
        modifiedon: z.string().describe('ISO 8601 timestamp of when the case was last modified; used as the incremental sync cursor'),
        modifiedby_id: z.string().optional().describe('GUID of the systemuser who last modified the case')
    })
    .describe(
        'A customer service case (Dataverse incident entity) with status, SLA tracking fields, and lookup references to the customer, owner, and related records'
    );

// Declared on the sync definition. Nango's checkpoint contract requires plain primitive fields
// (no .optional()), so presence/absence tolerance lives in ParsedCheckpointSchema below; both
// fields are always written together once a checkpoint exists.
const CheckpointSchema = z
    .object({
        last_version_number: z
            .number()
            .describe(
                'Dataverse versionnumber of the last-seen incident; the next incremental run fetches only incidents with versionnumber greater than this value. versionnumber is a unique, monotonically increasing rowversion, so unlike modifiedon it never ties across a page boundary.'
            ),
        last_full_sync: z
            .string()
            .describe('ISO 8601 timestamp of when the last delete-tracked full refresh completed; a new full refresh runs when this is older than 24 hours')
    })
    .describe('Incremental sync progress for the cases sync');

// Lenient reader for the stored checkpoint: fields may be absent on the first run (no checkpoint)
// or on checkpoints written by an older shape, so parse defensively before reading properties.
const ParsedCheckpointSchema = z.object({
    last_version_number: z.number().optional(),
    last_full_sync: z.string().optional()
});

function toCase(incident: z.infer<typeof RawIncidentSchema>): z.infer<typeof CaseSchema> {
    return CaseSchema.parse({
        id: incident.incidentid,
        ticketnumber: incident.ticketnumber ?? undefined,
        title: incident.title ?? undefined,
        description: incident.description ?? undefined,
        prioritycode: incident.prioritycode ?? undefined,
        severitycode: incident.severitycode ?? undefined,
        statecode: incident.statecode ?? undefined,
        statuscode: incident.statuscode ?? undefined,
        caseorigincode: incident.caseorigincode ?? undefined,
        casetypecode: incident.casetypecode ?? undefined,
        customersatisfactioncode: incident.customersatisfactioncode ?? undefined,
        customer_id: incident._customerid_value ?? undefined,
        primarycontact_id: incident._primarycontactid_value ?? undefined,
        parentcase_id: incident._parentcaseid_value ?? undefined,
        owner_id: incident._ownerid_value ?? undefined,
        subject_id: incident._subjectid_value ?? undefined,
        isescalated: incident.isescalated ?? undefined,
        escalatedon: incident.escalatedon ?? undefined,
        resolveby: incident.resolveby ?? undefined,
        responseby: incident.responseby ?? undefined,
        firstresponsesent: incident.firstresponsesent ?? undefined,
        firstresponseslastatus: incident.firstresponseslastatus ?? undefined,
        resolvebyslastatus: incident.resolvebyslastatus ?? undefined,
        followupby: incident.followupby ?? undefined,
        servicestage: incident.servicestage ?? undefined,
        stageid: incident.stageid ?? undefined,
        processid: incident.processid ?? undefined,
        onholdtime: incident.onholdtime ?? undefined,
        lastonholdtime: incident.lastonholdtime ?? undefined,
        blockedprofile: incident.blockedprofile ?? undefined,
        createdon: incident.createdon,
        createdby_id: incident._createdby_value ?? undefined,
        modifiedon: incident.modifiedon,
        modifiedby_id: incident._modifiedby_value ?? undefined
    });
}

const sync = createSync({
    description: 'Incrementally sync customer service cases (Dataverse incidents) using a modifiedon cursor, with a delete-tracked full refresh every 24 hours',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Case: CaseSchema
    },

    exec: async (nango) => {
        const checkpoint = ParsedCheckpointSchema.parse((await nango.getCheckpoint()) ?? {});
        const now = new Date();
        const lastFullSyncMs = checkpoint.last_full_sync ? Date.parse(checkpoint.last_full_sync) : Number.NaN;

        // Dataverse exposes no deleted-records feed, so deletions are detected by a periodic full
        // refresh. The first run (no version cursor) and an unparseable last_full_sync are always
        // treated as due for a full refresh.
        const isFullRefresh =
            checkpoint.last_version_number === undefined || Number.isNaN(lastFullSyncMs) || now.getTime() - lastFullSyncMs > FULL_REFRESH_INTERVAL_MS;

        let lastSeen: number | undefined = isFullRefresh ? undefined : checkpoint.last_version_number;
        let hasMorePages = true;
        let isFirstPage = true;

        while (hasMorePages) {
            const proxyConfig: ProxyConfiguration = {
                // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
                endpoint: '/api/data/v9.2/incidents',
                params: {
                    $select: INCIDENT_SELECT_FIELDS,
                    $orderby: 'versionnumber asc',
                    $top: PAGE_SIZE,
                    ...(lastSeen !== undefined && { $filter: `versionnumber gt ${lastSeen}` })
                },
                retries: 3
            };
            const response = await nango.get(proxyConfig);

            const parsed = RawIncidentsResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                // Throw instead of skipping: inside a delete-tracked full refresh, a silently skipped
                // page would cause trackDeletesEnd to falsely delete the cases on that page.
                throw new Error(`Failed to parse incidents response from Dataverse: ${parsed.error.message}`);
            }

            // No prerequisites to resolve, so the delete-tracking window opens as soon as the first
            // page has been fetched and validated (not before): a request or parse failure before
            // this point must never leave the window open. The full scan always starts from the
            // first page: the version cursor from the checkpoint must not filter this walk or
            // unchanged cases would be falsely deleted.
            if (isFirstPage && isFullRefresh) {
                await nango.trackDeletesStart('Case');
            }
            isFirstPage = false;

            const incidents = parsed.data.value;
            const lastIncident = incidents[incidents.length - 1];

            if (incidents.length > 0 && lastIncident) {
                await nango.batchSave(
                    incidents.map((incident) => toCase(incident)),
                    'Case'
                );
                lastSeen = lastIncident.versionnumber;

                if (!isFullRefresh) {
                    await nango.saveCheckpoint({
                        last_version_number: lastSeen,
                        // Always present by construction; the fallback only defends against
                        // checkpoints written without the field and simply delays the next full refresh.
                        last_full_sync: checkpoint.last_full_sync ?? now.toISOString()
                    });
                }
            }

            hasMorePages = incidents.length === PAGE_SIZE;
        }

        if (isFullRefresh) {
            // The full scan completed: close the delete-tracking window exactly once, then persist
            // progress. No checkpoint is saved mid-scan so a crashed run re-enters the full refresh
            // path (and trackDeletesStart) on its next invocation instead of looking incremental.
            // Closing the window first keeps last_full_sync stale if saving fails, forcing a retry.
            await nango.trackDeletesEnd('Case');
            const versionNumber = lastSeen ?? checkpoint.last_version_number;
            if (versionNumber !== undefined) {
                await nango.saveCheckpoint({
                    last_version_number: versionNumber,
                    last_full_sync: now.toISOString()
                });
            }
            // If the org has no cases at all there is no cursor worth persisting; the next run
            // re-enters the full refresh path and re-scans the (empty) entity set.
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
