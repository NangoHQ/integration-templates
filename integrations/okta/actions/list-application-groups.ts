import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    appId: z.string().describe('Application ID. Example: "0oa14y5qldjOIAGrc698"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(200).optional().describe('Number of results per page. Defaults to 20.')
});

const ApplicationGroupSchema = z.object({
    id: z.string(),
    lastUpdated: z.string().nullable().optional(),
    priority: z.number().nullable().optional(),
    profile: z.record(z.string(), z.unknown()).nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(ApplicationGroupSchema),
    nextCursor: z.string().optional()
});

function extractNextCursor(linkHeader: string | undefined): string | undefined {
    if (!linkHeader) {
        return undefined;
    }

    const parts = linkHeader.split(',');
    const nextLink = parts.find((part) => part.includes('rel="next"'));
    if (!nextLink) {
        return undefined;
    }

    const match = nextLink.match(/<([^>]+)>/);
    if (!match || match[1] === undefined) {
        return undefined;
    }

    const url = new URL(match[1]);
    const after = url.searchParams.get('after');
    return after || undefined;
}

function getHeaderValue(headers: unknown, name: string): string | undefined {
    if (typeof headers !== 'object' || headers === null) {
        return undefined;
    }
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() === name.toLowerCase()) {
            if (typeof value === 'string') {
                return value;
            }
            if (Array.isArray(value)) {
                return value.join(', ');
            }
            return undefined;
        }
    }
    return undefined;
}

const action = createAction({
    description: 'List groups assigned to an application.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.apps.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.okta.com/docs/reference/api/apps/#list-application-groups
            endpoint: `/api/v1/apps/${encodeURIComponent(input.appId)}/groups`,
            params: {
                ...(input.cursor !== undefined && { after: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const rawItems = z.array(z.unknown()).parse(response.data);
        const items = rawItems.map((item) => {
            const parsed = ApplicationGroupSchema.parse(item);
            return {
                id: parsed.id,
                ...(parsed.lastUpdated != null && { lastUpdated: parsed.lastUpdated }),
                ...(parsed.priority != null && { priority: parsed.priority }),
                ...(parsed.profile != null && { profile: parsed.profile })
            };
        });

        const linkValue = getHeaderValue(response.headers, 'link');
        const nextCursor = extractNextCursor(linkValue) || undefined;

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
