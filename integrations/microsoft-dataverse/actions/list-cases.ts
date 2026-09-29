import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const DEFAULT_SELECT_FIELDS = 'incidentid,ticketnumber,title,description,prioritycode,severitycode,statecode,statuscode,createdon,modifiedon,_customerid_value';

const InputSchema = z
    .object({
        select: z
            .string()
            .optional()
            .describe(
                'Comma-separated logical attribute names to return ($select). Example: "ticketnumber,title,createdon". Omit to return a curated default set of case attributes rather than every attribute Dataverse defines, which keeps the response well within the action output size limit. Ignored when cursor is provided.'
            ),
        filter: z
            .string()
            .optional()
            .describe(
                'OData $filter expression using logical attribute names. Example: "prioritycode eq 1 and statecode eq 0". Ignored when cursor is provided.'
            ),
        orderby: z.string().optional().describe('OData $orderby expression. Example: "createdon desc". Ignored when cursor is provided.'),
        top: z
            .number()
            .int()
            .positive()
            .optional()
            .describe(
                'Maximum number of cases to return ($top). Example: 50. This is a hard cap in Dataverse: when set, results are truncated at this count and no next_link is returned for the remaining matches. Omit to let Dataverse apply its own server-side page size and receive a next_link when more cases exist. Ignored when cursor is provided.'
            ),
        cursor: z
            .string()
            .optional()
            .describe(
                'Opaque pagination cursor: pass the next_link value returned by a previous response unchanged to fetch the next page. Omit for the first page. When set, select/filter/orderby/top are ignored because the cursor already encodes the original query.'
            )
    })
    .describe('Filters and pagination controlling which cases are returned. All fields are optional; with no input, the first page of all cases is listed.');

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

// Keep the serialized response safely under Nango's 2 MB action output limit even when a caller
// requests a wide select (z.looseObject preserves any extra attributes Dataverse returns).
const MAX_OUTPUT_BYTES = 1_900_000;

/**
 * @tags: [read]
 * @tagReason: Only reads case (incident) records through a single GET request; performs no provider mutations.
 * @pitfalls: Result order is nondeterministic unless orderby is provided, so top without orderby returns an arbitrary subset. top is a hard cap: when set, Dataverse does not emit @odata.nextLink beyond it, so no next_link is returned for records past the cap. A wide select (or the curated default) combined with a large unbounded page can still approach the 2 MB action output limit; this action rejects a response that would exceed a safe size.
 */
const action = createAction({
    description: 'List customer service cases (incidents).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let endpoint = '/api/data/v9.2/incidents';
        let params: Record<string, string | number>;

        if (input.cursor !== undefined) {
            let cursorUrl: URL;
            // @allowTryCatch: an unparsable cursor must surface as a caller-facing ActionError instead of an uncaught TypeError from the URL constructor.
            try {
                cursorUrl = new URL(input.cursor);
            } catch {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a valid next_link value returned by a previous list-cases call.'
                });
            }
            // Restricted to the incidents (cases) collection specifically so a caller cannot redirect
            // this action into returning another entity's records by passing a cursor that points elsewhere.
            if (cursorUrl.pathname !== '/api/data/v9.2/incidents') {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor does not point at the Dataverse incidents entity set.'
                });
            }
            endpoint = cursorUrl.pathname;
            // $skiptoken must be replayed together with the original $select/$filter/$orderby, so the
            // full next-link query string (not just the bare skiptoken) is preserved and reissued verbatim.
            params = Object.fromEntries(cursorUrl.searchParams.entries());
        } else {
            params = {
                $select: input.select ?? DEFAULT_SELECT_FIELDS,
                ...(input.filter !== undefined && { $filter: input.filter }),
                ...(input.orderby !== undefined && { $orderby: input.orderby }),
                // top is only forwarded when explicitly requested: Dataverse treats $top as a hard cap
                // on the whole result set and never emits @odata.nextLink for a $top-capped request, so
                // a default top here would silently disable pagination.
                ...(input.top !== undefined && { $top: input.top })
            };
        }

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
            endpoint,
            params,
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = ProviderResponseSchema.parse(response.data);

        const output: z.infer<typeof OutputSchema> = {
            cases: parsed.value,
            ...(parsed['@odata.nextLink'] !== undefined && { next_link: parsed['@odata.nextLink'] })
        };

        const outputSize = new TextEncoder().encode(JSON.stringify(output)).length;
        if (outputSize > MAX_OUTPUT_BYTES) {
            throw new nango.ActionError({
                type: 'response_too_large',
                message: `The response (~${Math.round(outputSize / 1024)} KB) is too large to return safely. Narrow the request with a smaller top, a more restrictive select, or a filter, and try again.`
            });
        }

        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
