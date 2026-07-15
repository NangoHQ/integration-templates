import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z
        .string()
        .min(1)
        .describe('A read-only GraphQL query string. Every object ID argument must be a full GID (e.g. gid://partners/App/123, gid://shopify/Shop/456).'),
    variables: z.record(z.string(), z.unknown()).optional().describe('GraphQL variables map.')
});

const GraphQLErrorSchema = z.object({
    message: z.string(),
    locations: z
        .array(
            z.object({
                line: z.number(),
                column: z.number()
            })
        )
        .optional(),
    path: z.array(z.union([z.string(), z.number()])).optional(),
    extensions: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z
    .object({
        data: z.record(z.string(), z.unknown()).optional(),
        errors: z.array(GraphQLErrorSchema).optional()
    })
    .passthrough();

function isMutationQuery(query: string): boolean {
    const withoutComments = query.replace(/#[^\n\r]*/g, '');
    const withoutBlockStrings = withoutComments.replace(/"""[\s\S]*?"""/g, '');
    const withoutStrings = withoutBlockStrings.replace(/"([^"\\]|\\.)*"/g, '');
    const trimmed = withoutStrings.trim().toLowerCase();
    return trimmed.startsWith('mutation');
}

const action = createAction({
    description: 'Run a constrained Partner API GraphQL query for cases the typed actions do not cover.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (isMutationQuery(input.query)) {
            throw new nango.ActionError({
                type: 'mutation_not_allowed',
                message: 'Mutation operations are not permitted through this action. Use a typed write action instead.'
            });
        }

        const response = await nango.post({
            // https://shopify.dev/docs/api/partner/latest
            endpoint: '2026-07/graphql.json',
            data: {
                query: input.query,
                variables: input.variables
            },
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
