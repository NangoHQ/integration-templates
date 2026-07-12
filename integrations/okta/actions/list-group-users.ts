import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('Group ID. Example: "00g14y5qi7zRLgyzT698"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderProfileSchema = z
    .object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().optional(),
        login: z.string().optional(),
        mobilePhone: z.string().nullable().optional(),
        secondEmail: z.string().nullable().optional()
    })
    .passthrough();

const ProviderUserSchema = z
    .object({
        id: z.string(),
        status: z.string(),
        created: z.string().optional(),
        activated: z.string().nullable().optional(),
        statusChanged: z.string().nullable().optional(),
        lastLogin: z.string().nullable().optional(),
        lastUpdated: z.string().optional(),
        passwordChanged: z.string().nullable().optional(),
        profile: ProviderProfileSchema.optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderUserSchema),
    nextCursor: z.string().optional()
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
    const match = linkHeader.match(/<[^>]+[?&]after=([^&>]+)[^>]*>;\s*rel="next"/i);
    return match?.[1] !== undefined ? decodeURIComponent(match[1]) : undefined;
}

const action = createAction({
    description: 'List users in a group',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.groups.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.okta.com/docs/reference/api/groups/#list-group-members
            endpoint: `/api/v1/groups/${encodeURIComponent(input.groupId)}/users`,
            params: {
                limit: '200',
                ...(input.cursor !== undefined && { after: input.cursor })
            },
            retries: 3
        });

        const users = z.array(ProviderUserSchema).parse(response.data);
        const nextCursor = extractNextCursor(getHeaderValue(response.headers, 'link'));

        return {
            items: users,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
