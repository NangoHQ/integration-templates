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
        data: z.record(z.string(), z.unknown()).nullable().optional(),
        errors: z.array(GraphQLErrorSchema).optional()
    })
    .passthrough();

// Walks the GraphQL document structurally (rather than sniffing the first keyword) so a
// mutation/subscription hidden behind leading fragments, comments, or another operation
// can't slip past the read-only guard.
function containsWriteOperation(query: string): boolean {
    const withoutComments = query.replace(/#[^\n\r]*/g, '');
    const withoutBlockStrings = withoutComments.replace(/"""[\s\S]*?"""/g, '""');
    const sanitized = withoutBlockStrings.replace(/"([^"\\]|\\.)*"/g, '""');

    const n = sanitized.length;
    let i = 0;

    const isNameChar = (c: string): boolean => /[_A-Za-z0-9]/.test(c);

    const skipIgnored = (): void => {
        while (i < n && /[\s,]/.test(sanitized[i]!)) i++;
    };

    const skipBalanced = (open: string, close: string): void => {
        let depth = 0;
        do {
            if (sanitized[i] === open) depth++;
            else if (sanitized[i] === close) depth--;
            i++;
        } while (depth > 0 && i < n);
    };

    const readName = (): string => {
        const start = i;
        while (i < n && isNameChar(sanitized[i]!)) i++;
        return sanitized.slice(start, i);
    };

    const skipDirectives = (): void => {
        skipIgnored();
        while (i < n && sanitized[i] === '@') {
            i++;
            readName();
            skipIgnored();
            if (sanitized[i] === '(') {
                skipBalanced('(', ')');
                skipIgnored();
            }
        }
    };

    const skipToSelectionSet = (): void => {
        skipDirectives();
        if (sanitized[i] !== '{') {
            throw new Error('expected a selection set');
        }
        skipBalanced('{', '}');
    };

    while (true) {
        skipIgnored();
        if (i >= n) break;

        if (sanitized[i] === '{') {
            // Anonymous shorthand form: `{ ... }` is always an implicit query.
            skipBalanced('{', '}');
            continue;
        }

        const keyword = readName();
        if (!keyword) {
            throw new Error('unexpected token');
        }

        if (keyword === 'fragment') {
            skipIgnored();
            readName(); // fragment name
            skipIgnored();
            readName(); // "on"
            skipIgnored();
            readName(); // type condition
            skipToSelectionSet();
            continue;
        }

        if (keyword === 'query' || keyword === 'mutation' || keyword === 'subscription') {
            if (keyword !== 'query') {
                return true;
            }
            skipIgnored();
            if (isNameChar(sanitized[i]!)) readName(); // optional operation name
            skipIgnored();
            if (sanitized[i] === '(') skipBalanced('(', ')'); // variable definitions
            skipToSelectionSet();
            continue;
        }

        throw new Error(`unexpected keyword "${keyword}"`);
    }

    return false;
}

const action = createAction({
    description: 'Run a constrained Partner API GraphQL query for cases the typed actions do not cover.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let isWrite: boolean;
        try {
            isWrite = containsWriteOperation(input.query);
        } catch (err) {
            throw new nango.ActionError({
                type: 'invalid_query',
                message: `Unable to validate the GraphQL query as read-only: ${err instanceof Error ? err.message : String(err)}`
            });
        }

        if (isWrite) {
            throw new nango.ActionError({
                type: 'mutation_not_allowed',
                message: 'Mutation and subscription operations are not permitted through this action. Use a typed write action instead.'
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
