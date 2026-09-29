import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        select: z
            .array(z.string())
            .optional()
            .describe(
                'Email attribute logical names to return (OData $select), e.g. ["subject", "directioncode", "createdon"]. "activityid" is always appended automatically. Omit to return all attributes.'
            ),
        filter: z.string().optional().describe('OData $filter expression, e.g. "directioncode eq true" or "modifiedon gt 2026-01-01T00:00:00Z".'),
        orderby: z.string().optional().describe('OData $orderby expression, e.g. "createdon desc".'),
        top: z.number().int().positive().optional().describe('Maximum number of emails to return (OData $top), e.g. 50.'),
        cursor: z
            .string()
            .optional()
            .describe(
                'Pagination cursor: the full "next_link" value from a previous call. When set, select/filter/orderby/top are ignored because the cursor already encodes the original query.'
            )
    })
    .describe('Filters for listing Dataverse email activities.');

const EmailSchema = z
    .object({
        activityid: z.string().describe('Unique identifier of the email activity (GUID).'),
        activitytypecode: z.string().optional().describe('Activity type of the record. Always "email" for records returned by this action.'),
        subject: z.string().nullable().optional().describe('Subject line of the email.'),
        description: z.string().nullable().optional().describe('Body of the email as HTML.'),
        directioncode: z.boolean().nullable().optional().describe('Direction of the email: true = outgoing, false = incoming.'),
        statuscode: z.number().nullable().optional().describe('Status reason of the email (e.g. 1 = Draft, 3 = Sent, 4 = Received).'),
        statecode: z.number().nullable().optional().describe('State of the email (0 = Open, 1 = Completed, 2 = Canceled, 3 = Scheduled).'),
        sender: z.string().nullable().optional().describe('Email address of the sender.'),
        torecipients: z.string().nullable().optional().describe('Semicolon-separated email addresses of the primary recipients.'),
        scheduledstart: z.string().nullable().optional().describe('Scheduled start time of the email activity (ISO 8601 UTC).'),
        scheduledend: z.string().nullable().optional().describe('Scheduled end time of the email activity (ISO 8601 UTC).'),
        createdon: z.string().optional().describe('Creation timestamp of the record (ISO 8601 UTC).'),
        modifiedon: z.string().optional().describe('Last-modified timestamp of the record (ISO 8601 UTC).')
    })
    .passthrough();

const OutputSchema = z
    .object({
        emails: z.array(EmailSchema).describe('The page of email activities returned by Dataverse.'),
        next_link: z
            .string()
            .optional()
            .describe(
                'Full URL of the next page when Dataverse server-driven paging applies. Pass it back as "cursor" to fetch the next page. Absent when no further pages exist.'
            )
    })
    .describe('A page of Dataverse email activities.');

const ListEmailsResponseSchema = z.object({
    value: z.array(EmailSchema),
    '@odata.nextLink': z.string().optional()
});

/**
 * @tags: [read]
 * @tagReason: Performs a read-only GET against the Dataverse emails entity set and never mutates provider data.
 * @pitfalls: Results have no guaranteed sort order unless orderby is provided. Returned records can include attributes beyond those listed in select, such as an ETag and the plain-text companion of the HTML body.
 */
const action = createAction({
    description: 'List Dataverse email activities.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let endpoint = '/api/data/v9.2/emails';
        const params: Record<string, string | number> = {};

        if (input.cursor !== undefined) {
            if (!URL.canParse(input.cursor)) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a valid next_link URL returned by a previous list-emails call.'
                });
            }
            const cursorUrl = new URL(input.cursor);
            if (!cursorUrl.pathname.endsWith('/emails')) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor does not point at the Dataverse emails entity set.'
                });
            }
            endpoint = cursorUrl.pathname;
            cursorUrl.searchParams.forEach((value, key) => {
                params[key] = value;
            });
        } else {
            const select = input.select !== undefined ? [...input.select] : undefined;
            if (select !== undefined && !select.some((field) => field.toLowerCase() === 'activityid')) {
                select.push('activityid');
            }
            if (select !== undefined && select.length > 0) {
                params['$select'] = select.join(',');
            }
            if (input.filter !== undefined) {
                params['$filter'] = input.filter;
            }
            if (input.orderby !== undefined) {
                params['$orderby'] = input.orderby;
            }
            if (input.top !== undefined) {
                params['$top'] = input.top;
            }
        }

        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
            endpoint,
            params,
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = ListEmailsResponseSchema.parse(response.data);

        const output: z.infer<typeof OutputSchema> = { emails: parsed.value };
        if (parsed['@odata.nextLink'] !== undefined) {
            output.next_link = parsed['@odata.nextLink'];
        }
        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
