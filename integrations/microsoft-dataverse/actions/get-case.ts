import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        incident_id: z.string().describe('GUID of the case (incident) to retrieve. Example: "e4f347d8-2abc-f111-aaad-7ced8d717fa5".'),
        select: z
            .array(z.string().describe('Logical name of a case attribute to return. Example: "title".'))
            .optional()
            .describe(
                'Optional list of case attribute logical names to return (sent as $select), including custom case fields. When omitted, the provider returns all attributes of the case. Attributes beyond the curated output fields are passed through unchanged.'
            )
    })
    .describe('Input for retrieving a single case by id.');

const OutputSchema = z
    .looseObject({
        id: z.string().describe('GUID of the case. Example: "e4f347d8-2abc-f111-aaad-7ced8d717fa5".'),
        ticketnumber: z.string().optional().describe('Auto-generated human-readable case number. Example: "CAS-01002-N1R9Z7".'),
        title: z.string().optional().describe('Short subject of the case.'),
        description: z.string().optional().describe('Detailed description of the case. Omitted when empty.'),
        statuscode: z.number().optional().describe('Status reason of the case. Example: 1 for "In Progress".'),
        statecode: z.number().optional().describe('State of the case: 0 = Active, 1 = Resolved, 2 = Canceled.'),
        prioritycode: z.number().optional().describe('Priority of the case: 1 = Low, 2 = Normal, 3 = High.'),
        severitycode: z.number().optional().describe('Severity of the case: 1 = Default.'),
        casetypecode: z.number().optional().describe('Type of the case: 1 = Question, 2 = Problem, 3 = Request. Omitted when not set.'),
        caseorigincode: z.number().optional().describe('Origin of the case. Example: 1 = Phone, 3 = Web. Omitted when not set.'),
        customer_id: z.string().optional().describe('GUID of the customer (account or contact) the case belongs to. Omitted when not set.'),
        owner_id: z.string().optional().describe('GUID of the user or team that owns the case.'),
        createdon: z.string().optional().describe('ISO 8601 timestamp of when the case was created. Example: "2026-09-29T17:26:03Z".'),
        modifiedon: z.string().optional().describe('ISO 8601 timestamp of when the case was last modified. Example: "2026-09-29T17:26:03Z".')
    })
    .describe(
        'The retrieved case record. Attributes beyond the ones listed, including custom case fields, depend on the select input and are passed through unchanged.'
    );

const KNOWN_INCIDENT_KEYS = new Set([
    'incidentid',
    'ticketnumber',
    'title',
    'description',
    'statuscode',
    'statecode',
    'prioritycode',
    'severitycode',
    'casetypecode',
    'caseorigincode',
    '_customerid_value',
    '_ownerid_value',
    'createdon',
    'modifiedon'
]);

const IncidentSchema = z.looseObject({
    incidentid: z.string().optional(),
    ticketnumber: z.string().optional(),
    title: z.string().optional(),
    description: z.string().nullable().optional(),
    // Option-set fields can be explicitly null on the provider record (e.g. a case
    // created without a priority or severity assigned), not just absent.
    statuscode: z.number().nullable().optional(),
    statecode: z.number().nullable().optional(),
    prioritycode: z.number().nullable().optional(),
    severitycode: z.number().nullable().optional(),
    casetypecode: z.number().nullable().optional(),
    caseorigincode: z.number().nullable().optional(),
    _customerid_value: z.string().nullable().optional(),
    _ownerid_value: z.string().optional(),
    createdon: z.string().optional(),
    modifiedon: z.string().optional()
});

/**
 * @tags: [read]
 * @tagReason: Performs a single provider read of a case (incident) record by id with no mutations.
 * @pitfalls: When select is provided, only the requested attributes are returned, so unselected output fields are omitted even when the case has values for them; the case id is always returned regardless of the selection. Option-set fields (statuscode, statecode, prioritycode, severitycode) may be explicitly null when unset on the case, in which case they are omitted from the output.
 */
const action = createAction({
    description: 'Retrieve a single case by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
        const response = await nango.get({
            endpoint: `/api/data/v9.2/incidents(${encodeURIComponent(input.incident_id)})`,
            params: {
                ...(input.select !== undefined && input.select.length > 0 && { $select: input.select.join(',') })
            },
            retries: 3
        });

        const incident = IncidentSchema.parse(response.data);
        const extraFields = Object.fromEntries(Object.entries(incident).filter(([key]) => !KNOWN_INCIDENT_KEYS.has(key)));

        return {
            ...extraFields,
            id: incident.incidentid ?? input.incident_id,
            ...(incident.ticketnumber != null && { ticketnumber: incident.ticketnumber }),
            ...(incident.title != null && { title: incident.title }),
            ...(incident.description != null && { description: incident.description }),
            ...(incident.statuscode != null && { statuscode: incident.statuscode }),
            ...(incident.statecode != null && { statecode: incident.statecode }),
            ...(incident.prioritycode != null && { prioritycode: incident.prioritycode }),
            ...(incident.severitycode != null && { severitycode: incident.severitycode }),
            ...(incident.casetypecode != null && { casetypecode: incident.casetypecode }),
            ...(incident.caseorigincode != null && { caseorigincode: incident.caseorigincode }),
            ...(incident._customerid_value != null && { customer_id: incident._customerid_value }),
            ...(incident._ownerid_value != null && { owner_id: incident._ownerid_value }),
            ...(incident.createdon != null && { createdon: incident.createdon }),
            ...(incident.modifiedon != null && { modifiedon: incident.modifiedon })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
