import { z } from 'zod';
import { createAction } from 'nango';

const PolicyTypeSchema = z.enum([
    'OKTA_SIGN_ON',
    'PASSWORD',
    'MFA_ENROLL',
    'IDP_DISCOVERY',
    'ACCESS_POLICY',
    'PROFILE_ENROLLMENT',
    'ENTITY_RISK',
    'POST_AUTH_SESSION',
    'DEVICE_SIGNAL_COLLECTION',
    'SESSION_VIOLATION_DETECTION',
    'CLIENT_UPDATE',
    'IDENTITY_CLAIM_SOURCING'
]);

const PolicyStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

const InputSchema = z.object({
    type: PolicyTypeSchema.describe('Policy type to filter by. Example: "OKTA_SIGN_ON"'),
    status: PolicyStatusSchema.optional().describe('Filter by policy status. Example: "ACTIVE"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const PolicySchema = z
    .object({
        id: z.string(),
        type: z.string(),
        name: z.string(),
        status: z.string(),
        description: z.string().nullable().optional(),
        priority: z.number().optional(),
        system: z.boolean().optional(),
        active: z.boolean().optional(),
        created: z.string().optional(),
        lastUpdated: z.string().optional(),
        conditions: z.unknown().optional(),
        settings: z.unknown().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(PolicySchema),
    next_cursor: z.string().optional().describe('Cursor to fetch the next page.')
});

function extractNextCursor(linkHeader: unknown): string | undefined {
    if (typeof linkHeader !== 'string') {
        return undefined;
    }
    const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    if (!match || match[1] === undefined) {
        return undefined;
    }
    // @allowTryCatch Malformed URLs in the Link header should not crash the action; fall back to no next cursor.
    try {
        const url = new URL(match[1]);
        return url.searchParams.get('after') || undefined;
    } catch {
        return undefined;
    }
}

const action = createAction({
    description: 'List policies of a given type.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.policies.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.okta.com/docs/reference/api/policy/#list-all-policies
            endpoint: '/api/v1/policies',
            params: {
                type: input.type,
                ...(input.status !== undefined && { status: input.status }),
                ...(input.cursor !== undefined && { after: input.cursor })
            },
            retries: 3
        });

        const parsed = z.array(PolicySchema).safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response format.',
                details: parsed.error.issues
            });
        }

        const nextCursor = extractNextCursor(response.headers['link']);

        return {
            items: parsed.data,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
