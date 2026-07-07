import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(200).optional().describe('Number of results per page. Maximum is 200.')
});

const ApplicationSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        label: z.string(),
        status: z.string(),
        lastUpdated: z.string().optional(),
        created: z.string().optional(),
        signOnMode: z.string().optional(),
        features: z.array(z.string()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ApplicationSchema),
    nextCursor: z.string().optional()
});

function extractNextCursor(linkHeader: string | string[] | undefined): string | undefined {
    if (!linkHeader) {
        return undefined;
    }
    const headerValue = Array.isArray(linkHeader) ? linkHeader.join(', ') : linkHeader;
    const nextMatch = headerValue.match(/<([^>]+)>;\s*rel="next"/);
    if (!nextMatch) {
        return undefined;
    }
    const url = nextMatch[1];
    if (!url) {
        return undefined;
    }
    const afterMatch = url.match(/[?&]after=([^&]+)/);
    if (!afterMatch || !afterMatch[1]) {
        return undefined;
    }
    return decodeURIComponent(afterMatch[1]);
}

const action = createAction({
    description: 'List applications',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.apps.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.okta.com/docs/reference/api/apps/#list-applications
        const response = await nango.get({
            endpoint: '/api/v1/apps',
            params: {
                ...(input.cursor && { after: input.cursor }),
                ...(input.limit && { limit: String(input.limit) })
            },
            retries: 3
        });

        const apps = z.array(ApplicationSchema).parse(response.data);
        const linkHeader = response.headers['link'] || response.headers['Link'];
        const nextCursor = extractNextCursor(linkHeader);

        return {
            items: apps,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
