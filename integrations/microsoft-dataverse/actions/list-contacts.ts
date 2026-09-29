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
        top: z.number().int().positive().optional().describe('Maximum number of contacts to return in this page (OData $top).'),
        expand: z
            .string()
            .optional()
            .describe('OData $expand expression inlining related records such as the parent account. Example: "parentcustomerid_account($select=name)".'),
        cursor: z.string().optional().describe("Opaque pagination cursor from a previous response's next_cursor. Omit for the first page.")
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

function extractSkipToken(nextLink: string): string | undefined {
    const match = /[?&]\$skiptoken=([^&]+)/.exec(nextLink);
    if (!match?.[1]) {
        return undefined;
    }
    return decodeURIComponent(match[1]);
}

/**
 * @tags: [read]
 * @tagReason: Performs only a read-only GET listing contacts; no provider data is created, modified, or deleted.
 * @pitfalls: Lookup fields such as the parent account are returned as `_<logicalname>_value` GUID properties (e.g. `_parentcustomerid_value`), and navigation-property names are rejected in `select`; use `expand` to inline the related record.
 */
const action = createAction({
    description: 'List contacts (people).',
    version: '1.0.0',
    input: ListContactsInputSchema,
    output: ListContactsOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof ListContactsOutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
            endpoint: '/api/data/v9.2/contacts',
            params: {
                ...(input.select && { $select: input.select }),
                ...(input.filter && { $filter: input.filter }),
                ...(input.orderby && { $orderby: input.orderby }),
                ...(input.top !== undefined && { $top: input.top }),
                ...(input.expand && { $expand: input.expand }),
                ...(input.cursor && { $skiptoken: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = ListContactsResponseSchema.parse(response.data);
        const nextCursor = parsed['@odata.nextLink'] !== undefined ? extractSkipToken(parsed['@odata.nextLink']) : undefined;

        return {
            contacts: parsed.value,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
