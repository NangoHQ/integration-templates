import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('User ID. Example: "00u14y5n6uhI2lpQ3698"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(200).optional().describe('Number of results per page. Default is determined by the provider.')
});

const OktaGroupSchema = z.object({
    id: z.string(),
    created: z.string().optional(),
    lastUpdated: z.string().optional(),
    lastMembershipUpdated: z.string().optional(),
    objectClass: z.array(z.string()).optional(),
    type: z.string().optional(),
    profile: z
        .object({
            name: z.string().optional(),
            description: z.string().optional()
        })
        .optional()
});

const OutputGroupSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional(),
    objectClass: z.array(z.string()).optional(),
    created: z.string().optional(),
    lastUpdated: z.string().optional(),
    lastMembershipUpdated: z.string().optional()
});

const OutputSchema = z.object({
    groups: z.array(OutputGroupSchema),
    nextCursor: z.string().optional()
});

function getHeaderValue(headers: unknown, name: string): string | undefined {
    if (typeof headers !== 'object' || headers === null) {
        return undefined;
    }
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() === name.toLowerCase()) {
            return typeof value === 'string' ? value : undefined;
        }
    }
    return undefined;
}

function extractNextCursor(linkHeader: string | undefined): string | undefined {
    if (!linkHeader) {
        return undefined;
    }
    const match = linkHeader.match(/<[^>]+[?&]after=([^&>]+)[^>]*>;\s*rel="next"/i);
    return match?.[1] !== undefined ? decodeURIComponent(match[1]) : undefined;
}

const action = createAction({
    description: 'List the groups a user belongs to.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.users.read', 'okta.groups.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.okta.com/docs/reference/api/groups/
            endpoint: `/api/v1/users/${encodeURIComponent(input.userId)}/groups`,
            params: {
                ...(input.cursor !== undefined && { after: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const groups = z.array(OktaGroupSchema).parse(response.data);
        const nextCursor = extractNextCursor(getHeaderValue(response.headers, 'link'));

        return {
            groups: groups.map((group) => ({
                id: group.id,
                ...(group.profile?.name !== undefined && { name: group.profile.name }),
                ...(group.profile?.description !== undefined && { description: group.profile.description }),
                ...(group.type !== undefined && { type: group.type }),
                ...(group.objectClass !== undefined && { objectClass: group.objectClass }),
                ...(group.created !== undefined && { created: group.created }),
                ...(group.lastUpdated !== undefined && { lastUpdated: group.lastUpdated }),
                ...(group.lastMembershipUpdated !== undefined && { lastMembershipUpdated: group.lastMembershipUpdated })
            })),
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
