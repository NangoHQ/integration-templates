import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        select: z
            .string()
            .optional()
            .describe('Comma-separated logical attribute names to return ($select). Example: "ticketnumber,title,createdon". Omit to return all attributes.'),
        filter: z.string().optional().describe('OData $filter expression using logical attribute names. Example: "prioritycode eq 1 and statecode eq 0".'),
        orderby: z.string().optional().describe('OData $orderby expression. Example: "createdon desc".'),
        top: z.number().int().positive().optional().describe('Maximum number of cases to return ($top). Example: 50.')
    })
    .describe('Filters controlling which cases are returned. All fields are optional; with no input, all cases are listed.');

const CaseSchema = z
    .looseObject({
        incidentid: z.string().describe('Unique identifier of the case (GUID).'),
        ticketnumber: z.string().nullable().optional().describe('Auto-generated case number shown to users. Example: "CAS-01004-P1B2C3".'),
        title: z.string().nullable().optional().describe('Title (subject) of the case.'),
        description: z.string().nullable().optional().describe('Detailed description of the customer issue.'),
        prioritycode: z.number().nullable().optional().describe('Priority option set value: 1 = High, 2 = Normal, 3 = Low.'),
        severitycode: z.number().nullable().optional().describe('Severity option set value: 1 = Default.'),
        statecode: z.number().nullable().optional().describe('State option set value: 0 = Active, 1 = Resolved, 2 = Canceled.'),
        statuscode: z.number().nullable().optional().describe('Status reason option set value; its meaning depends on statecode.'),
        createdon: z.string().nullable().optional().describe('ISO 8601 UTC timestamp when the case was created. Example: "2026-01-15T09:30:00Z".'),
        modifiedon: z.string().nullable().optional().describe('ISO 8601 UTC timestamp when the case was last modified.'),
        _customerid_value: z.string().nullable().optional().describe('GUID of the customer (account or contact) the case is associated with.')
    })
    .describe('A customer service case (incident) record. Attributes beyond the ones listed depend on the select input.');

const OutputSchema = z
    .object({
        cases: z.array(CaseSchema).describe('Cases matching the query. Empty when no cases exist or match the filter.'),
        next_link: z
            .string()
            .optional()
            .describe('Absolute URL of the next page (Dataverse @odata.nextLink). Only present when the result exceeds the server page size.')
    })
    .describe('The matching customer service cases and an optional server-provided link to the next page.');

const ProviderResponseSchema = z.object({
    value: z.array(CaseSchema),
    '@odata.nextLink': z.string().optional()
});

/**
 * @tags: [read]
 * @tagReason: Only reads case (incident) records through a single GET request; performs no provider mutations.
 * @pitfalls: Result order is nondeterministic unless orderby is provided, so top without orderby returns an arbitrary subset. There is no way to page: top truncates the result without a next_link, and a returned next_link cannot be followed through this action.
 */
const action = createAction({
    description: 'List customer service cases (incidents).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
            endpoint: '/api/data/v9.2/incidents',
            params: {
                ...(input.select !== undefined && { $select: input.select }),
                ...(input.filter !== undefined && { $filter: input.filter }),
                ...(input.orderby !== undefined && { $orderby: input.orderby }),
                ...(input.top !== undefined && { $top: input.top })
            },
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            cases: parsed.value,
            ...(parsed['@odata.nextLink'] !== undefined && { next_link: parsed['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
