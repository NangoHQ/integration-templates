import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    to: z.string().optional().describe('Only show calls made to this phone number, SIP address, Client identifier or SIM SID. Example: "+15558675310"'),
    from: z.string().optional().describe('Only include calls from this phone number, SIP address, Client identifier or SIM SID. Example: "+15552223214"'),
    parentCallSid: z.string().optional().describe('Only include calls spawned by calls with this SID. Example: "CAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"'),
    status: z
        .enum(['queued', 'ringing', 'in-progress', 'canceled', 'completed', 'failed', 'busy', 'no-answer'])
        .optional()
        .describe('The status of the calls to include.'),
    startTime: z.string().optional().describe('Only include calls that started on this date. Format: YYYY-MM-DD in UTC. Example: "2009-07-06"'),
    startTimeBefore: z.string().optional().describe('Only include calls that started before this date. Format: YYYY-MM-DD in UTC. Example: "2009-07-06"'),
    startTimeAfter: z.string().optional().describe('Only include calls that started on or after this date. Format: YYYY-MM-DD in UTC. Example: "2009-07-06"'),
    endTime: z.string().optional().describe('Only include calls that ended on this date. Format: YYYY-MM-DD in UTC. Example: "2009-07-06"'),
    endTimeBefore: z.string().optional().describe('Only include calls that ended before this date. Format: YYYY-MM-DD in UTC. Example: "2009-07-06"'),
    endTimeAfter: z.string().optional().describe('Only include calls that ended on or after this date. Format: YYYY-MM-DD in UTC. Example: "2009-07-06"'),
    pageSize: z.number().int().min(1).max(1000).optional().describe('How many resources to return in each list page. Default is 50, maximum is 1000.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Maps to Twilio PageToken. Omit for the first page.')
});

const CallSchema = z.object({
    sid: z.string().optional(),
    account_sid: z.string().optional(),
    parent_call_sid: z.string().optional().nullable(),
    phone_number_sid: z.string().optional().nullable(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    to: z.string().optional().nullable(),
    to_formatted: z.string().optional().nullable(),
    from: z.string().optional().nullable(),
    from_formatted: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    start_time: z.string().optional().nullable(),
    end_time: z.string().optional().nullable(),
    duration: z.string().optional().nullable(),
    price: z.string().optional().nullable(),
    price_unit: z.string().optional().nullable(),
    direction: z.string().optional().nullable(),
    answered_by: z.string().optional().nullable(),
    api_version: z.string().optional().nullable(),
    forwarded_from: z.string().optional().nullable(),
    group_sid: z.string().optional().nullable(),
    caller_name: z.string().optional().nullable(),
    queue_time: z.string().optional().nullable(),
    trunk_sid: z.string().optional().nullable(),
    uri: z.string().optional().nullable(),
    subresource_uris: z.record(z.string(), z.string()).optional().nullable()
});

const OutputSchema = z.object({
    calls: z.array(CallSchema),
    next_page_uri: z.string().optional().nullable()
});

const ListResponseSchema = z.object({
    calls: z.array(z.unknown()).optional(),
    next_page_uri: z.string().optional().nullable().optional()
});

const MetadataSchema = z.object({
    account_sid: z.string().optional()
});

const action = createAction({
    description: 'List calls from Twilio.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-calls',
        group: 'Calls'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());
        const accountSid = metadata.account_sid;

        if (!accountSid) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'Could not retrieve AccountSid from connection metadata.'
            });
        }

        const params: Record<string, string | number> = {};
        if (input.to !== undefined) {
            params['To'] = input.to;
        }
        if (input.from !== undefined) {
            params['From'] = input.from;
        }
        if (input.parentCallSid !== undefined) {
            params['ParentCallSid'] = input.parentCallSid;
        }
        if (input.status !== undefined) {
            params['Status'] = input.status;
        }
        if (input.startTime !== undefined) {
            params['StartTime'] = input.startTime;
        }
        if (input.startTimeBefore !== undefined) {
            params['StartTimeBefore'] = input.startTimeBefore;
        }
        if (input.startTimeAfter !== undefined) {
            params['StartTimeAfter'] = input.startTimeAfter;
        }
        if (input.endTime !== undefined) {
            params['EndTime'] = input.endTime;
        }
        if (input.endTimeBefore !== undefined) {
            params['EndTimeBefore'] = input.endTimeBefore;
        }
        if (input.endTimeAfter !== undefined) {
            params['EndTimeAfter'] = input.endTimeAfter;
        }
        if (input.pageSize !== undefined) {
            params['PageSize'] = input.pageSize;
        }
        if (input.cursor !== undefined) {
            params['PageToken'] = input.cursor;
        }

        // https://www.twilio.com/docs/voice/api/call-resource#retrieve-a-list-of-calls
        const response = await nango.get({
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Calls.json`,
            params,
            retries: 3
        });

        const data = response.data;
        if (!data || typeof data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Twilio API.'
            });
        }

        const listResponse = ListResponseSchema.parse(data);
        const rawCalls = Array.isArray(listResponse.calls) ? listResponse.calls : [];
        const calls = rawCalls
            .map((item) => {
                const parsed = CallSchema.safeParse(item);
                if (parsed.success) {
                    return parsed.data;
                }
                return null;
            })
            .filter((c) => c !== null);

        return {
            calls: calls,
            next_page_uri: listResponse.next_page_uri ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
