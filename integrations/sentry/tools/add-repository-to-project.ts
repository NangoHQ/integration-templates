import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        organizationIdOrSlug: z.string().min(1).describe('Organization ID or slug.'),
        projectIdOrSlug: z.string().min(1).describe('Project ID or slug.'),
        repositoryId: z
            .string()
            .regex(/^[0-9]+$/)
            .describe('Sentry organization repository ID; a digit string because the upstream body requires an integer.')
    })
    .describe('Target organization and project, plus the existing organization repository to link to the project.');

const OutputSchema = z
    .object({
        id: z.string().describe('Project-repository link ID.'),
        projectId: z.string().describe('Linked project ID.'),
        repositoryId: z.string().describe('Linked organization repository ID.'),
        source: z.string().describe('Provider source of the association.'),
        created: z.boolean().describe('True if this call created the link; false if it already existed.')
    })
    .describe('The project-repository association, whether newly created or already present.');

const LinkResponseSchema = z.object({
    id: z.string(),
    projectId: z.string(),
    repositoryId: z.string(),
    source: z.string(),
    created: z.boolean()
});

function errorStatus(error: unknown): number | undefined {
    if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = error.response;
        if (typeof response === 'object' && response !== null && 'status' in response) {
            const status = response.status;
            if (typeof status === 'number') {
                return status;
            }
        }
    }
    return undefined;
}

/**
 * @tags: [write]
 * @tagReason: Mutates the provider by adding a project-repository association in Sentry; it performs no provider reads.
 * @pitfalls: The repository must already be connected to the organization through a VCS integration; a repository that is missing, disabled, or belongs to another organization fails as not_found. Repeating an existing link succeeds and returns created:false instead of an error.
 */
const tool = createTool({
    name: 'add-repository-to-project',
    description: 'Connect an existing organization repository to a project without creating a repository.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Provide the Sentry repository ID of a repository already connected to the organization through a VCS integration. This adds an association only. Use `list-project-repositories` to inspect existing links; adding an existing link is safe and returns created:false.',
        requiredScopes: ['project:write'],
        tags: { read_only_hint: 'false', destructive_hint: 'false', idempotent_hint: 'true' }
    },

    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        const repositoryId = Number(input.repositoryId);
        if (!Number.isSafeInteger(repositoryId)) {
            throw new Error(
                'invalid_request: repositoryId is outside the exact integer range and cannot be sent to Sentry without rounding. Verify the repository ID.'
            );
        }

        let response;
        // @allowTryCatch: map provider HTTP error statuses to the tool's documented public error codes.
        try {
            // Sentry documents this POST as idempotent (an existing link returns 200 instead of a new mutation), so retries cannot duplicate the association.
            // https://docs.sentry.io/api/projects/link-a-repository-to-a-project/
            response = await nango.post({
                endpoint: `/0/projects/${encodeURIComponent(input.organizationIdOrSlug)}/${encodeURIComponent(input.projectIdOrSlug)}/repo/`,
                data: {
                    repositoryId: repositoryId
                },
                retries: 3
            });
        } catch (error) {
            const status = errorStatus(error);
            if (status === 400) {
                throw new Error(
                    'invalid_request: Sentry rejected the repository association. Verify the repository belongs to the organization and is connected through VCS.'
                );
            }
            if (status === 404) {
                throw new Error('not_found: The project or repository is unavailable. Verify both target identifiers and organization membership.');
            }
            if (status === 403) {
                throw new Error('permission_denied: Project write authority is insufficient. Ask for project write access.');
            }
            throw error;
        }

        const parsed = LinkResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(
                'write_result_unknown: The link may have been created but the response could not be mapped. Inspect `list-project-repositories`; repeating the same association is documented as idempotent.'
            );
        }

        return parsed.data;
    }
});

export default tool;
