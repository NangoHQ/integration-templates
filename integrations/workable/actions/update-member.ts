import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The member identifier. Example: "1f395d"'),
    roles: z
        .array(z.string())
        .describe(
            'The member roles to set (full replace). Use built-in values (ats.admin, ats.simple, ats.reviewer, hris.admin, hris.employee, hris.limited, workable.superadmin) or permission-set names from list-permission-sets. Example: ["ats.admin", "hris.admin"]'
        ),
    collaboration_rules: z
        .array(
            z.object({
                role: z.string(),
                departments: z.array(z.unknown()).optional(),
                locations: z.array(z.unknown()).optional()
            })
        )
        .optional()
        .describe('Collaboration rules to set for the member.')
});

const ProviderMemberSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    headline: z.string().optional().nullable(),
    email: z.string().optional(),
    roles: z.array(z.string()).optional(),
    active: z.boolean().optional(),
    collaboration_rules: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    headline: z.string().optional(),
    email: z.string().optional(),
    roles: z.array(z.string()).optional(),
    active: z.boolean().optional(),
    collaboration_rules: z.array(z.unknown()).optional()
});

const action = createAction({
    description: "Update an existing member's roles/collaboration rules.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_members'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const maxAttempts = 3;
        let lastError: unknown;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            // @allowTryCatch 422 "Member is being updated" is a transient concurrent-edit conflict; retry with backoff.
            try {
                // https://workable.readme.io/reference/members-put
                const response = await nango.put({
                    endpoint: '/spi/v3/members',
                    data: {
                        id: input.id,
                        roles: input.roles,
                        ...(input.collaboration_rules !== undefined && { collaboration_rules: input.collaboration_rules })
                    },
                    retries: 3
                });

                const providerMember = ProviderMemberSchema.parse(response.data);

                return {
                    id: providerMember.id,
                    ...(providerMember.name != null && { name: providerMember.name }),
                    ...(providerMember.headline != null && { headline: providerMember.headline }),
                    ...(providerMember.email != null && { email: providerMember.email }),
                    ...(providerMember.roles != null && { roles: providerMember.roles }),
                    ...(providerMember.active != null && { active: providerMember.active }),
                    ...(providerMember.collaboration_rules != null && { collaboration_rules: providerMember.collaboration_rules })
                };
            } catch (error) {
                lastError = error;

                if (attempt < maxAttempts && isConcurrentEditError(error)) {
                    await new Promise((resolve) => setTimeout(resolve, attempt * 500));
                    continue;
                }

                throw error;
            }
        }

        throw lastError;
    }
});

function isConcurrentEditError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
        return false;
    }

    let status: unknown;
    if ('status' in error) {
        status = error.status;
    } else if ('response' in error && typeof error.response === 'object' && error.response !== null && 'status' in error.response) {
        status = error.response.status;
    }

    if (status !== 422) {
        return false;
    }

    let message: unknown;
    if ('message' in error && typeof error.message === 'string') {
        message = error.message;
    } else if (
        'response' in error &&
        typeof error.response === 'object' &&
        error.response !== null &&
        'data' in error.response &&
        typeof error.response.data === 'object' &&
        error.response.data !== null
    ) {
        if ('error' in error.response.data && typeof error.response.data.error === 'string') {
            message = error.response.data.error;
        } else if ('message' in error.response.data && typeof error.response.data.message === 'string') {
            message = error.response.data.message;
        }
    }

    return typeof message === 'string' && message.includes('Member is being updated');
}

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
