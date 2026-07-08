import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    since: z.string().optional().describe('Start date/time in ISO 8601 format. Example: "2024-01-01T00:00:00Z"'),
    until: z.string().optional().describe('End date/time in ISO 8601 format. Example: "2024-01-02T00:00:00Z"'),
    filter: z.string().optional().describe('Okta filter expression. Example: "eventType eq "user.session.start""'),
    q: z.string().optional().describe('Search query string.'),
    sortOrder: z.enum(['ASCENDING', 'DESCENDING']).optional().describe('Sort order. Defaults to ASCENDING.'),
    limit: z.number().optional().describe('Max number of events to return per page. Default 100, max 1000.'),
    cursor: z.string().optional().describe('Pagination cursor (after value) from the previous response. Omit for the first page.')
});

const ActorSchema = z
    .object({
        id: z.string().nullish(),
        type: z.string().nullish(),
        alternateId: z.string().nullish(),
        displayName: z.string().nullish(),
        detailEntry: z.unknown().nullish()
    })
    .passthrough();

const ClientSchema = z
    .object({
        userAgent: z
            .object({
                rawUserAgent: z.string().nullish(),
                os: z.string().nullish(),
                browser: z.string().nullish()
            })
            .passthrough()
            .nullish(),
        geographicalContext: z.unknown().nullish(),
        zone: z.string().nullish(),
        ipAddress: z.string().nullish(),
        device: z.string().nullish(),
        id: z.string().nullish()
    })
    .passthrough();

const OutcomeSchema = z
    .object({
        result: z.string().nullish(),
        reason: z.string().nullish()
    })
    .passthrough();

const TargetSchema = z
    .object({
        id: z.string().nullish(),
        type: z.string().nullish(),
        alternateId: z.string().nullish(),
        displayName: z.string().nullish(),
        detailEntry: z.unknown().nullish()
    })
    .passthrough();

const TransactionSchema = z
    .object({
        type: z.string().nullish(),
        id: z.string().nullish(),
        detail: z.unknown().nullish()
    })
    .passthrough();

const SystemLogEventSchema = z
    .object({
        uuid: z.string(),
        published: z.string(),
        eventType: z.string(),
        version: z.string().nullish(),
        severity: z.string().nullish(),
        actor: ActorSchema.nullish(),
        client: ClientSchema.nullish(),
        outcome: OutcomeSchema.nullish(),
        target: z.array(TargetSchema).nullish(),
        transaction: TransactionSchema.nullish(),
        debugContext: z
            .object({
                debugData: z.unknown().nullish()
            })
            .passthrough()
            .nullish(),
        authenticationContext: z.unknown().nullish(),
        displayMessage: z.string().nullish(),
        legacyEventType: z.string().nullish()
    })
    .passthrough();

const OutputSchema = z.object({
    events: z.array(SystemLogEventSchema),
    nextCursor: z.string().optional()
});

function getHeaderValue(headers: unknown, name: string): string | string[] | undefined {
    if (typeof headers !== 'object' || headers === null) {
        return undefined;
    }
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() === name.toLowerCase()) {
            if (typeof value === 'string' || Array.isArray(value)) {
                return value;
            }
            return undefined;
        }
    }
    return undefined;
}

const action = createAction({
    description: 'List system log events.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.logs.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.since !== undefined) {
            params['since'] = input.since;
        }
        if (input.until !== undefined) {
            params['until'] = input.until;
        }
        if (input.filter !== undefined) {
            params['filter'] = input.filter;
        }
        if (input.q !== undefined) {
            params['q'] = input.q;
        }
        if (input.sortOrder !== undefined) {
            params['sortOrder'] = input.sortOrder;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.cursor !== undefined) {
            params['after'] = input.cursor;
        }

        // https://developer.okta.com/docs/reference/api/system-log/
        const response = await nango.get({
            endpoint: '/api/v1/logs',
            params,
            retries: 3
        });

        const rawEvents = z.array(z.unknown()).parse(response.data);
        const events = rawEvents.map((item) => SystemLogEventSchema.parse(item));

        const rawLink = getHeaderValue(response.headers, 'link');
        let linkHeader: string | undefined;
        if (typeof rawLink === 'string') {
            linkHeader = rawLink;
        } else if (Array.isArray(rawLink)) {
            linkHeader = rawLink.join(',');
        }

        let nextCursor: string | undefined;
        if (typeof linkHeader === 'string') {
            const nextLink = linkHeader
                .split(',')
                .map((part) => part.trim())
                .find((part) => part.includes('rel="next"'));
            if (nextLink) {
                const urlMatch = nextLink.match(/<([^>]+)>/);
                const url = urlMatch ? urlMatch[1] : undefined;
                if (url) {
                    const urlObj = new URL(url);
                    const after = urlObj.searchParams.get('after');
                    if (after) {
                        nextCursor = after;
                    }
                }
            }
        }

        return {
            events,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
