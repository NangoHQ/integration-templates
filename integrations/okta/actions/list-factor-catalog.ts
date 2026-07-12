import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('User ID. Example: "00u14u78lfuUpDWf0698"')
});

const FactorLinkSchema = z.object({
    href: z.string(),
    hints: z
        .object({
            allow: z.array(z.string()).optional()
        })
        .optional()
});

const FactorLinksSchema = z.object({
    enroll: FactorLinkSchema.optional(),
    self: FactorLinkSchema.optional()
});

const ProviderFactorSchema = z.object({
    id: z.string().optional(),
    factorType: z.string(),
    provider: z.string(),
    status: z.string().optional(),
    _links: FactorLinksSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderFactorSchema)
});

const action = createAction({
    description: 'List the factor types available for a specific user to enroll.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.factors.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.okta.com/docs/reference/api/factors/
        const response = await nango.get({
            endpoint: `/api/v1/users/${encodeURIComponent(input.userId)}/factors/catalog`,
            retries: 3
        });

        const rawItems = response.data;
        if (!Array.isArray(rawItems)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array from the factor catalog endpoint.'
            });
        }

        const items = rawItems.map((item: unknown) => {
            const factor = ProviderFactorSchema.parse(item);
            return {
                ...(factor.id !== undefined && { id: factor.id }),
                factorType: factor.factorType,
                provider: factor.provider,
                ...(factor.status !== undefined && { status: factor.status }),
                ...(factor._links !== undefined && { _links: factor._links })
            };
        });

        return { items };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
