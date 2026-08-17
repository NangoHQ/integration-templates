import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().min(1).describe('The identifier of the issue to unarchive. Example: "6948bf28-149d-489b-8f0d-eebae9be8324"')
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            issueUnarchive: z
                .object({
                    success: z.boolean(),
                    entity: z
                        .object({
                            id: z.string(),
                            identifier: z.string(),
                            title: z.string(),
                            archivedAt: z.string().nullable().optional()
                        })
                        .nullable()
                        .optional()
                })
                .nullable()
                .optional()
        })
        .nullable()
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                extensions: z.record(z.string(), z.unknown()).optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    issueId: z.string().nullable(),
    identifier: z.string().nullable(),
    title: z.string().nullable(),
    archivedAt: z.string().nullable()
});

const action = createAction({
    description: 'Restore an archived Linear issue.',
    version: '1.0.5',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://linear.app/developers
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `
                    mutation IssueUnarchive($id: String!) {
                        issueUnarchive(id: $id) {
                            success
                            entity {
                                id
                                identifier
                                title
                                archivedAt
                            }
                        }
                    }
                `,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        // Check GraphQL errors before validating the payload shape so provider messages are preserved.
        // `.passthrough()` keeps provider diagnostics such as `extensions` instead of stripping them.
        const errorCheck = z
            .object({
                errors: z
                    .array(
                        z
                            .object({
                                message: z.string()
                            })
                            .passthrough()
                    )
                    .min(1)
            })
            .safeParse(response.data);
        if (errorCheck.success) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: errorCheck.data.errors.map((error) => error.message).join(', '),
                errors: errorCheck.data.errors
            });
        }

        const parsedResult = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResult.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Linear API.',
                details: parsedResult.error.issues
            });
        }

        const parsed = parsedResult.data;

        if (!parsed.data || !parsed.data.issueUnarchive) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'GraphQL response did not contain issueUnarchive data.'
            });
        }

        const payload = parsed.data.issueUnarchive;

        return {
            success: payload.success,
            issueId: payload.entity?.id ?? null,
            identifier: payload.entity?.identifier ?? null,
            title: payload.entity?.title ?? null,
            archivedAt: payload.entity?.archivedAt ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
