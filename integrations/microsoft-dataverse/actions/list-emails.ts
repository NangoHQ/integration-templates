import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const DEFAULT_SELECT_FIELDS = [
    'activityid',
    'subject',
    'directioncode',
    'statuscode',
    'statecode',
    'sender',
    'torecipients',
    'scheduledstart',
    'scheduledend',
    'createdon',
    'modifiedon'
];

const InputSchema = z
    .object({
        select: z
            .array(z.string())
            .optional()
            .describe(
                'Email attribute logical names to return (OData $select), e.g. ["subject", "directioncode", "createdon"]. "activityid" is always appended automatically. Omit to return a curated default set of fields rather than every attribute Dataverse defines; the default intentionally excludes description (the email body), which can be large, to keep the response well within the action output size limit. Pass "description" explicitly to include the body.'
            ),
        filter: z.string().optional().describe('OData $filter expression, e.g. "directioncode eq true" or "modifiedon gt 2026-01-01T00:00:00Z".'),
        orderby: z.string().optional().describe('OData $orderby expression, e.g. "createdon desc".'),
        top: z
            .number()
            .int()
            .positive()
            .optional()
            .describe(
                'Maximum number of emails to return (OData $top), e.g. 50. This is a hard cap in Dataverse: when set, results are truncated at this count and no next_link is returned for the remaining matches. Omit to let Dataverse apply its own server-side page size and receive a next_link when more emails exist.'
            ),
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
 * @pitfalls: Results have no guaranteed sort order unless orderby is provided. Returned records can include attributes beyond those listed in select, such as an ETag and the plain-text companion of the HTML body. top is a hard cap: when set, Dataverse does not emit @odata.nextLink beyond it, so no next_link is returned for records past the cap. The default select excludes description (the HTML body) to bound response size; this action rejects a response that would exceed a safe size.
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
            const select = input.select !== undefined ? [...input.select] : [...DEFAULT_SELECT_FIELDS];
            if (!select.some((field) => field.toLowerCase() === 'activityid')) {
                select.push('activityid');
            }
            params['$select'] = select.join(',');
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

        // Keep the serialized response safely under Nango's 2 MB action output limit: an explicit
        // select including description (the email body) combined with a large page can still be big.
        const outputSize = new TextEncoder().encode(JSON.stringify(output)).length;
        if (outputSize > 1_900_000) {
            throw new nango.ActionError({
                type: 'response_too_large',
                message: `The response (~${Math.round(outputSize / 1024)} KB) is too large to return safely. Narrow the request with a smaller top, a more restrictive select (e.g. excluding description), or a filter, and try again.`
            });
        }

        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
