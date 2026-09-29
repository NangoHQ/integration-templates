import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        title: z.string().describe('Title (subject) of the case. Example: "Coffee machine leaks water".'),
        description: z.string().optional().describe('Detailed description of the customer issue.'),
        customerid: z
            .string()
            .optional()
            .describe('ID (GUID) of the account or contact that is the customer for this case. Example: "88cea450-cb0c-ea11-a813-000d3a1b1223".'),
        customertype: z
            .enum(['account', 'contact'])
            .optional()
            .describe('Entity type of the record referenced by customerid. Only used when customerid is provided; defaults to "account".'),
        casetypecode: z.number().int().optional().describe('Type of the case. Standard option values: 1 = Question, 2 = Problem, 3 = Request. Example: 2.'),
        prioritycode: z.number().int().optional().describe('Priority of the case. Standard option values: 1 = High, 2 = Normal, 3 = Low. Example: 2.'),
        caseorigincode: z
            .number()
            .int()
            .optional()
            .describe(
                'Origin channel of the case. Standard option values: 1 = Phone, 2 = Email, 3 = Web, 2483 = Facebook, 3986 = Twitter, 700610000 = IoT. Example: 3.'
            )
    })
    .describe('Fields for the new customer service case. Only title is required; all other fields map to optional incident attributes.');

const IncidentSchema = z.object({
    incidentid: z.string(),
    title: z.string().nullable().optional(),
    ticketnumber: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    casetypecode: z.number().nullable().optional(),
    prioritycode: z.number().nullable().optional(),
    caseorigincode: z.number().nullable().optional(),
    createdon: z.string().nullable().optional(),
    _customerid_value: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('ID (GUID) of the created case (incidentid). Example: "0f6f5b3a-9c2e-4a1d-8b7c-1d2e3f4a5b6c".'),
        title: z.string().describe('Title of the created case.'),
        ticketnumber: z
            .string()
            .optional()
            .describe('Auto-generated human-readable case reference number (ticketnumber). Example: "CAS-01004-P1B2C3". Omitted when not returned.'),
        description: z.string().optional().describe('Description stored on the created case. Omitted when empty.'),
        casetypecode: z.number().optional().describe('Case type option value stored on the record. Omitted when empty.'),
        prioritycode: z.number().optional().describe('Priority option value stored on the record. Omitted when empty.'),
        caseorigincode: z.number().optional().describe('Case origin option value stored on the record. Omitted when empty.'),
        customerid: z
            .string()
            .optional()
            .describe('ID (GUID) of the account or contact set as the customer of the case. Omitted when no customer was provided.'),
        createdon: z.string().optional().describe('ISO 8601 timestamp of when the case was created. Example: "2026-09-29T17:31:00Z".')
    })
    .describe('The created customer service case, read back from Dataverse after creation.');

/**
 * @tags: [read, write]
 * @tagReason: Creates a case via POST (write), then reads the created record back via GET (read).
 * @pitfalls: customerid is matched against the entity type named by customertype, which defaults to "account"; passing a GUID of the wrong entity type fails the create with a not-found error.
 */
const action = createAction({
    description: 'Create a customer service case',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const customerEntitySets: Record<'account' | 'contact', string> = {
            account: 'accounts',
            contact: 'contacts'
        };
        const customerType = input.customertype ?? 'account';

        const data: Record<string, unknown> = {
            title: input.title,
            ...(input.description !== undefined && { description: input.description }),
            ...(input.casetypecode !== undefined && { casetypecode: input.casetypecode }),
            ...(input.prioritycode !== undefined && { prioritycode: input.prioritycode }),
            ...(input.caseorigincode !== undefined && { caseorigincode: input.caseorigincode }),
            ...(input.customerid !== undefined && {
                [`customerid_${customerType}@odata.bind`]: `/${customerEntitySets[customerType]}(${input.customerid})`
            })
        };

        const createConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/create-entity-web-api
            endpoint: '/api/data/v9.2/incidents',
            data,
            // A retried create would insert duplicate cases; the API has no idempotency key.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- non-idempotent create must not be retried; the rule fixer only suggests > 0.
            retries: 0
        };
        const createResponse = await nango.post(createConfig);

        const entityIdHeader: unknown = createResponse.headers['odata-entityid'];
        const entityIdMatch = typeof entityIdHeader === 'string' ? /incidents\(([0-9a-fA-F-]{36})\)/.exec(entityIdHeader) : null;
        const incidentId = entityIdMatch?.[1];

        if (!incidentId) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Could not determine the ID of the created case from the OData-EntityId response header.'
            });
        }

        const getConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
            endpoint: `/api/data/v9.2/incidents(${encodeURIComponent(incidentId)})`,
            params: {
                $select: 'incidentid,title,ticketnumber,description,casetypecode,prioritycode,caseorigincode,createdon,_customerid_value'
            },
            retries: 3
        };
        const getResponse = await nango.get(getConfig);

        const incident = IncidentSchema.parse(getResponse.data);

        return {
            id: incident.incidentid,
            title: incident.title ?? input.title,
            ...(incident.ticketnumber != null && { ticketnumber: incident.ticketnumber }),
            ...(incident.description != null && { description: incident.description }),
            ...(incident.casetypecode != null && { casetypecode: incident.casetypecode }),
            ...(incident.prioritycode != null && { prioritycode: incident.prioritycode }),
            ...(incident.caseorigincode != null && { caseorigincode: incident.caseorigincode }),
            ...(incident._customerid_value != null && { customerid: incident._customerid_value }),
            ...(incident.createdon != null && { createdon: incident.createdon })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
