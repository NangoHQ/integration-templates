import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    policyId: z.string().describe('The ID of the policy. Example: "00p14u78ldpLmNhTB698"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const PolicyRuleSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        status: z.string(),
        name: z.string(),
        priority: z.number().optional(),
        system: z.boolean().optional(),
        created: z.string().optional(),
        lastUpdated: z.string().optional(),
        conditions: z.unknown().optional(),
        actions: z.unknown().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(PolicyRuleSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List the rules under a policy',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.policies.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.okta.com/docs/reference/api/policy/#list-policy-rules
            endpoint: `/api/v1/policies/${encodeURIComponent(input.policyId)}/rules`,
            params: {
                ...(input.cursor !== undefined && { after: input.cursor })
            },
            retries: 3
        });

        const items = z.array(PolicyRuleSchema).parse(response.data);

        let next_cursor: string | undefined;
        const linkHeader = response.headers?.['link'];
        if (typeof linkHeader === 'string') {
            const match = linkHeader.match(/<[^>]+[?&]after=([^>]+)>;\s*rel="next"/);
            if (match && match[1]) {
                next_cursor = match[1];
            }
        }

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
