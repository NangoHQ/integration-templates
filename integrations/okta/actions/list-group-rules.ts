import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderGroupRuleSchema = z
    .object({
        id: z.string(),
        type: z.string().optional(),
        status: z.string().optional(),
        name: z.string().optional(),
        conditions: z.unknown().optional(),
        actions: z.unknown().optional(),
        created: z.string().optional(),
        lastUpdated: z.string().optional(),
        lastUpdatedBy: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderGroupRuleSchema),
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

const action = createAction({
    description: 'List group membership rules.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.groups.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.okta.com/docs/reference/api/groups/
        const response = await nango.get({
            endpoint: '/api/v1/groups/rules',
            params: {
                ...(input.cursor && { after: input.cursor })
            },
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of group rules from the provider.'
            });
        }

        const providerRules = z.array(ProviderGroupRuleSchema).safeParse(response.data);
        if (!providerRules.success) {
            throw new nango.ActionError({
                type: 'validation_failed',
                message: 'Provider response did not match expected group rule schema.'
            });
        }

        let next_cursor: string | undefined;
        const linkHeader = getHeaderValue(response.headers, 'link');
        if (typeof linkHeader === 'string') {
            const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
            if (nextMatch && nextMatch[1]) {
                const nextUrl = new URL(nextMatch[1]);
                const after = nextUrl.searchParams.get('after');
                if (after) {
                    next_cursor = after;
                }
            }
        }

        return {
            items: providerRules.data,
            ...(next_cursor && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
