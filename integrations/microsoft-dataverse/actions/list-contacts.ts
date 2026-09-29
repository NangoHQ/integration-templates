import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const ListContactsInputSchema = z
    .object({
        select: z
            .string()
            .optional()
            .describe('Comma-separated contact fields to return (OData $select). Example: "fullname,emailaddress1,telephone1". Omit to return all fields.'),
        filter: z.string().optional().describe('OData $filter expression restricting which contacts are returned. Example: "firstname eq \'Kevin\'".'),
        orderby: z.string().optional().describe('OData $orderby expression controlling sort order. Example: "createdon desc".'),
        top: z
            .number()
            .int()
            .positive()
            .optional()
            .describe(
                'Maximum number of contacts to return in this page (OData $top). This is a hard cap in Dataverse: when set, results are truncated at this count and no next_cursor is returned for the remaining matches. Omit to let Dataverse apply its own server-side page size and receive a next_cursor when more contacts exist.'
            ),
        expand: z
            .string()
            .optional()
            .describe('OData $expand expression inlining related records such as the parent account. Example: "parentcustomerid_account($select=name)".'),
        cursor: z
            .string()
            .optional()
            .describe(
                'Opaque pagination cursor: pass the next_cursor value returned by a previous response unchanged to fetch the next page. Omit for the first page. When set, select/filter/orderby/top/expand are ignored because the cursor already encodes the original query.'
            )
    })
    .describe('Filters, field selection, and pagination options for listing contacts.');

const ContactSchema = z
    .object({
        contactid: z.string().describe('Unique identifier (GUID) of the contact. Example: "cdcfa450-cb0c-ea11-a813-000d3a1b1223".'),
        fullname: z.string().nullable().optional().describe("Contact's full display name."),
        firstname: z.string().nullable().optional().describe('Given name of the contact.'),
        lastname: z.string().nullable().optional().describe('Family name of the contact.'),
        emailaddress1: z.string().nullable().optional().describe('Primary email address of the contact.'),
        telephone1: z.string().nullable().optional().describe('Primary phone number of the contact.'),
        jobtitle: z.string().nullable().optional().describe('Job title of the contact.'),
        _parentcustomerid_value: z.string().nullable().optional().describe('GUID of the parent account or contact this contact is associated with.'),
        statecode: z.number().int().optional().describe('State of the contact: 0 = Active, 1 = Inactive.'),
        statuscode: z.number().int().optional().describe('Reason for the contact state (default: 1 = Active, 2 = Inactive).'),
        createdon: z.string().optional().describe('ISO 8601 UTC timestamp when the contact was created. Example: "2026-09-18T19:43:05Z".'),
        modifiedon: z.string().optional().describe('ISO 8601 UTC timestamp when the contact was last modified.')
    })
    .passthrough();

const ListContactsOutputSchema = z
    .object({
        contacts: z.array(ContactSchema).describe('Page of contact records matching the request.'),
        next_cursor: z.string().optional().describe('Opaque cursor to pass back as cursor to fetch the next page. Absent when no further pages exist.')
    })
    .describe('A page of contacts plus an optional cursor for the next page.');

const ListContactsResponseSchema = z.object({
    value: z.array(ContactSchema),
    '@odata.nextLink': z.string().optional()
});

/**
 * @tags: [read]
 * @tagReason: Performs only a read-only GET listing contacts; no provider data is created, modified, or deleted.
 * @pitfalls: Lookup fields such as the parent account are returned as `_<logicalname>_value` GUID properties (e.g. `_parentcustomerid_value`), and navigation-property names are rejected in `select`; use `expand` to inline the related record. top is a hard cap: when set, Dataverse does not emit @odata.nextLink beyond it, so no next_cursor is returned for records past the cap.
 */
const action = createAction({
    description: 'List contacts (people).',
    version: '1.0.0',
    input: ListContactsInputSchema,
    output: ListContactsOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof ListContactsOutputSchema>> => {
        let endpoint = '/api/data/v9.2/contacts';
        let params: Record<string, string | number>;

        if (input.cursor !== undefined) {
            let cursorUrl: URL;
            // @allowTryCatch: an unparsable cursor must surface as a caller-facing ActionError instead of an uncaught TypeError from the URL constructor.
            try {
                cursorUrl = new URL(input.cursor);
            } catch {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a valid next_cursor value returned by a previous list-contacts call.'
                });
            }
            // Restricted to the contacts collection specifically so a caller cannot redirect this
            // action into returning another entity's records by passing a cursor that points elsewhere.
            if (cursorUrl.pathname !== '/api/data/v9.2/contacts') {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor does not point at the Dataverse contacts entity set.'
                });
            }
            endpoint = cursorUrl.pathname;
            // $skiptoken must be replayed together with the original $select/$filter/$orderby, so the
            // full next-link query string (not just the bare skiptoken) is preserved and reissued verbatim.
            params = Object.fromEntries(cursorUrl.searchParams.entries());
        } else {
            params = {
                ...(input.select && { $select: input.select }),
                ...(input.filter && { $filter: input.filter }),
                ...(input.orderby && { $orderby: input.orderby }),
                // top is only forwarded when explicitly requested: Dataverse treats $top as a hard cap
                // on the whole result set and never emits @odata.nextLink for a $top-capped request, so
                // a default top here would silently disable pagination.
                ...(input.top !== undefined && { $top: input.top }),
                ...(input.expand && { $expand: input.expand })
            };
        }

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
            endpoint,
            params,
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = ListContactsResponseSchema.parse(response.data);

        return {
            contacts: parsed.value,
            ...(parsed['@odata.nextLink'] !== undefined && { next_cursor: parsed['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
