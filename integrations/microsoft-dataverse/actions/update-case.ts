import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        incidentid: z.string().describe('The unique identifier (GUID) of the case to update. Example: "3f2504e0-4f89-41d3-9a0c-0305e82c3301"'),
        title: z.string().optional().describe('The title or subject of the case. Example: "Cannot log in to the customer portal"'),
        description: z.string().nullable().optional().describe('A detailed description of the case. Set to null to clear the existing description.'),
        prioritycode: z.number().int().optional().describe('The priority of the case. 1 = High, 2 = Normal, 3 = Low.'),
        casetypecode: z.number().int().optional().describe('The type of the case. 1 = Question, 2 = Problem, 3 = Request.'),
        caseorigincode: z
            .number()
            .int()
            .optional()
            .describe('The origin of the case. 1 = Phone, 2 = Email, 3 = Web, 2483 = Facebook, 3986 = Twitter, 700610000 = IoT.'),
        severitycode: z.number().int().optional().describe('The severity of the case. 1 = Default Value.'),
        customersatisfactioncode: z
            .number()
            .int()
            .optional()
            .describe('The customer satisfaction with the case. 5 = Very Satisfied, 4 = Satisfied, 3 = Neutral, 2 = Dissatisfied, 1 = Very Dissatisfied.'),
        statecode: z.number().int().optional().describe('The state of the case. 0 = Active, 1 = Resolved, 2 = Cancelled.'),
        statuscode: z
            .number()
            .int()
            .optional()
            .describe(
                'The status reason of the case. Active: 1 = In Progress, 2 = On Hold, 3 = Waiting for Details, 4 = Researching. Resolved: 5 = Problem Solved, 1000 = Information Provided. Cancelled: 6 = Cancelled, 2000 = Merged.'
            )
    })
    .describe('Fields to update on an existing Dataverse case (incident). Provide incidentid plus at least one field to change.');

const ProviderCaseSchema = z.object({
    incidentid: z.string(),
    ticketnumber: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    prioritycode: z.number().nullable().optional(),
    casetypecode: z.number().nullable().optional(),
    caseorigincode: z.number().nullable().optional(),
    severitycode: z.number().nullable().optional(),
    customersatisfactioncode: z.number().nullable().optional(),
    statecode: z.number().nullable().optional(),
    statuscode: z.number().nullable().optional(),
    createdon: z.string().nullable().optional(),
    modifiedon: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        incidentid: z.string().describe('The unique identifier (GUID) of the updated case.'),
        ticketnumber: z.string().optional().describe('The auto-generated case number for tracking. Example: "CAS-01005-X7V9K0"'),
        title: z.string().optional().describe('The title or subject of the case.'),
        description: z.string().optional().describe('A detailed description of the case. Omitted when not set.'),
        prioritycode: z.number().optional().describe('The priority of the case. 1 = High, 2 = Normal, 3 = Low.'),
        casetypecode: z.number().optional().describe('The type of the case. 1 = Question, 2 = Problem, 3 = Request.'),
        caseorigincode: z
            .number()
            .optional()
            .describe('The origin of the case. 1 = Phone, 2 = Email, 3 = Web, 2483 = Facebook, 3986 = Twitter, 700610000 = IoT.'),
        severitycode: z.number().optional().describe('The severity of the case. 1 = Default Value.'),
        customersatisfactioncode: z
            .number()
            .optional()
            .describe('The customer satisfaction with the case. 5 = Very Satisfied, 4 = Satisfied, 3 = Neutral, 2 = Dissatisfied, 1 = Very Dissatisfied.'),
        statecode: z.number().optional().describe('The state of the case. 0 = Active, 1 = Resolved, 2 = Cancelled.'),
        statuscode: z.number().optional().describe('The status reason of the case, which must be valid for the current statecode.'),
        createdon: z.string().optional().describe('The date and time when the case was created, in ISO 8601 format.'),
        modifiedon: z.string().optional().describe('The date and time when the case was last modified, in ISO 8601 format.')
    })
    .describe('The updated Dataverse case (incident) record, read back after the update. Fields that are not set on the record are omitted.');

/**
 * @tags: [read, write]
 * @tagReason: Updates the case's fields via PATCH (write) and reads back the updated record via GET (read).
 * @pitfalls: Resolving or cancelling a case by patching statecode/statuscode is not guaranteed to run Dataverse's full case-resolution workflow, which is normally done with the dedicated CloseIncident bound action. Any statuscode set must be a valid status reason for the target statecode.
 */
const action = createAction({
    description: "Update a case's fields (e.g. resolve, change priority).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, string | number | null> = {};
        if (input.title !== undefined) {
            data['title'] = input.title;
        }
        if (input.description !== undefined) {
            data['description'] = input.description;
        }
        if (input.prioritycode !== undefined) {
            data['prioritycode'] = input.prioritycode;
        }
        if (input.casetypecode !== undefined) {
            data['casetypecode'] = input.casetypecode;
        }
        if (input.caseorigincode !== undefined) {
            data['caseorigincode'] = input.caseorigincode;
        }
        if (input.severitycode !== undefined) {
            data['severitycode'] = input.severitycode;
        }
        if (input.customersatisfactioncode !== undefined) {
            data['customersatisfactioncode'] = input.customersatisfactioncode;
        }
        if (input.statecode !== undefined) {
            data['statecode'] = input.statecode;
        }
        if (input.statuscode !== undefined) {
            data['statuscode'] = input.statuscode;
        }

        if (Object.keys(data).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one field to update must be provided alongside incidentid.'
            });
        }

        const patchConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/update-delete-entities-using-web-api
            endpoint: `/api/data/v9.2/incidents(${encodeURIComponent(input.incidentid)})`,
            data,
            // PATCH applies a partial merge of absolute field values, so a retry after a lost response is safe.
            retries: 3
        };
        await nango.patch(patchConfig);

        const getConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
            endpoint: `/api/data/v9.2/incidents(${encodeURIComponent(input.incidentid)})`,
            params: {
                $select:
                    'incidentid,ticketnumber,title,description,prioritycode,casetypecode,caseorigincode,severitycode,customersatisfactioncode,statecode,statuscode,createdon,modifiedon'
            },
            retries: 3
        };
        const response = await nango.get(getConfig);

        const caseRecord = ProviderCaseSchema.parse(response.data);

        return {
            incidentid: caseRecord.incidentid,
            ...(caseRecord.ticketnumber != null && { ticketnumber: caseRecord.ticketnumber }),
            ...(caseRecord.title != null && { title: caseRecord.title }),
            ...(caseRecord.description != null && { description: caseRecord.description }),
            ...(caseRecord.prioritycode != null && { prioritycode: caseRecord.prioritycode }),
            ...(caseRecord.casetypecode != null && { casetypecode: caseRecord.casetypecode }),
            ...(caseRecord.caseorigincode != null && { caseorigincode: caseRecord.caseorigincode }),
            ...(caseRecord.severitycode != null && { severitycode: caseRecord.severitycode }),
            ...(caseRecord.customersatisfactioncode != null && { customersatisfactioncode: caseRecord.customersatisfactioncode }),
            ...(caseRecord.statecode != null && { statecode: caseRecord.statecode }),
            ...(caseRecord.statuscode != null && { statuscode: caseRecord.statuscode }),
            ...(caseRecord.createdon != null && { createdon: caseRecord.createdon }),
            ...(caseRecord.modifiedon != null && { modifiedon: caseRecord.modifiedon })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
