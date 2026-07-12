import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    authServerId: z.string().describe('Authorization server ID. Example: "aus14u78liihuiepy698"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(200).optional().describe('Number of scopes to return per page. Default is determined by the provider.')
});

const ProviderScopeSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    consent: z.string().nullable().optional(),
    metadataPublish: z.string().nullable().optional(),
    default: z.boolean().nullable().optional(),
    optional: z.boolean().nullable().optional(),
    system: z.boolean().nullable().optional()
});

const ScopeSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    displayName: z.string().optional(),
    consent: z.string().optional(),
    metadataPublish: z.string().optional(),
    default: z.boolean().optional(),
    optional: z.boolean().optional(),
    system: z.boolean().optional()
});

const OutputSchema = z.object({
    items: z.array(ScopeSchema),
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
        }
    }
    return undefined;
}

function extractNextCursorFromLinkHeader(linkHeader: string | undefined): string | undefined {
    if (!linkHeader) {
        return undefined;
    }
    const parts = linkHeader.split(',');
    for (const part of parts) {
        const match = part.match(/<[^>]*[?&]after=([^&]*)[^>]*>;\s*rel="next"/);
        if (match && match[1] !== undefined) {
            return decodeURIComponent(match[1]);
        }
    }
    return undefined;
}

const action = createAction({
    description: 'List the OAuth scopes defined on an authorization server.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.authorizationServers.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.okta.com/docs/reference/api/authorization-servers/#list-all-custom-token-scopes
            endpoint: `/api/v1/authorizationServers/${encodeURIComponent(input.authServerId)}/scopes`,
            params: {
                ...(input.cursor !== undefined && { after: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const rawItems = z.array(z.unknown()).parse(response.data);
        const items = rawItems.map((item: unknown) => {
            const parsed = ProviderScopeSchema.parse(item);
            return {
                id: parsed.id,
                name: parsed.name,
                ...(parsed.description != null && { description: parsed.description }),
                ...(parsed.displayName != null && { displayName: parsed.displayName }),
                ...(parsed.consent != null && { consent: parsed.consent }),
                ...(parsed.metadataPublish != null && { metadataPublish: parsed.metadataPublish }),
                ...(parsed.default != null && { default: parsed.default }),
                ...(parsed.optional != null && { optional: parsed.optional }),
                ...(parsed.system != null && { system: parsed.system })
            };
        });

        const linkHeader = getHeaderValue(response.headers, 'link');
        const next_cursor = extractNextCursorFromLinkHeader(linkHeader);

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
