import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('Group ID. Example: "00g14y5qi7zRLgyzT698"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderAppSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        label: z.string().optional(),
        status: z.string().optional(),
        lastUpdated: z.string().optional(),
        created: z.string().optional(),
        accessibility: z
            .object({
                selfService: z.boolean().optional(),
                errorRedirectUrl: z.string().optional(),
                loginRedirectUrl: z.string().optional()
            })
            .optional()
            .nullable(),
        visibility: z
            .object({
                autoSubmitToolbar: z.boolean().optional(),
                hide: z
                    .object({
                        iOS: z.boolean().optional(),
                        web: z.boolean().optional()
                    })
                    .optional()
            })
            .optional()
            .nullable(),
        features: z.array(z.string()).optional().nullable(),
        signOnMode: z.string().optional(),
        credentials: z.object({}).passthrough().optional().nullable(),
        settings: z.object({}).passthrough().optional().nullable(),
        profile: z.record(z.string(), z.unknown()).optional().nullable(),
        _links: z.record(z.string(), z.unknown()).optional().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderAppSchema),
    next_cursor: z.string().optional()
});

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

function extractNextCursor(linkHeader: unknown): string | undefined {
    if (typeof linkHeader !== 'string') {
        return undefined;
    }
    const parts = linkHeader.split(',');
    for (const part of parts) {
        const match = part.match(/<([^>]+)>;\s*rel="next"/i);
        if (match && match[1]) {
            const after = new URL(match[1]).searchParams.get('after');
            return after ?? undefined;
        }
    }
    return undefined;
}

const action = createAction({
    description: 'List applications assigned to a group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.groups.read', 'okta.apps.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.okta.com/docs/reference/api/groups/#list-assigned-applications
            endpoint: `/api/v1/groups/${encodeURIComponent(input.groupId)}/apps`,
            params: {
                ...(input.cursor && { after: input.cursor }),
                limit: 200
            },
            retries: 3
        };

        const response = await nango.get(config);
        const items = z.array(ProviderAppSchema).parse(response.data);
        const next_cursor = extractNextCursor(getHeaderValue(response.headers, 'link'));

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
