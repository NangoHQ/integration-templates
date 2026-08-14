import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "octo-org"'),
        repo: z.string().describe('Repository name. Example: "hello-world"'),
        run_id: z.number().int().positive().describe('Workflow run ID. Example: 123456789'),
        cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page. Maximum 100.')
    })
    .describe('Input parameters for listing workflow run artifacts.');

const WorkflowRunSchema = z
    .object({
        id: z.number().describe('Workflow run ID.'),
        repository_id: z.number().describe('Repository ID.'),
        head_repository_id: z.number().optional().describe('Head repository ID.'),
        head_branch: z.string().optional().describe('Head branch name.'),
        head_sha: z.string().optional().describe('Head commit SHA.')
    })
    .describe('Workflow run metadata associated with an artifact.');

const ArtifactSchema = z
    .object({
        id: z.number().describe('Artifact ID.'),
        node_id: z.string().optional().describe('Artifact node ID.'),
        name: z.string().optional().describe('Artifact name.'),
        size_in_bytes: z.number().optional().describe('Artifact size in bytes.'),
        url: z.string().optional().describe('API URL for the artifact.'),
        archive_download_url: z.string().optional().describe('URL to download the artifact archive.'),
        expired: z.boolean().optional().describe('Whether the artifact has expired.'),
        created_at: z.string().optional().describe('Creation timestamp in ISO 8601 format.'),
        expires_at: z.string().optional().describe('Expiration timestamp in ISO 8601 format.'),
        updated_at: z.string().optional().describe('Last updated timestamp in ISO 8601 format.'),
        workflow_run: WorkflowRunSchema.optional().describe('Workflow run that produced this artifact, when known.')
    })
    .describe('A workflow run artifact.');

const OutputSchema = z
    .object({
        artifacts: z.array(ArtifactSchema).describe('Artifacts produced by the workflow run.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page. Omit if there are no more results.')
    })
    .describe('Output containing workflow run artifacts and pagination cursor.');

/**
 * @tags: [read]
 * @tagReason: Lists artifacts from an existing workflow run without modifying provider data.
 * @pitfalls: Successful workflow runs can return an empty artifacts array when the job never explicitly uploads artifacts.
 */
const action = createAction({
    description: 'List artifacts produced by a workflow run.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['actions:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^[1-9]\d*$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer string representing a page number.'
            });
        }

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        const perPage = input.per_page ?? 30;

        // https://docs.github.com/rest/actions/artifacts#list-workflow-run-artifacts
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/runs/${encodeURIComponent(String(input.run_id))}/artifacts`,
            params: {
                page: String(page),
                per_page: String(perPage)
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            total_count: z.number(),
            artifacts: z.array(
                z.object({
                    id: z.number(),
                    node_id: z.string().optional(),
                    name: z.string().optional(),
                    size_in_bytes: z.number().optional(),
                    url: z.string().optional(),
                    archive_download_url: z.string().optional(),
                    expired: z.boolean().optional(),
                    created_at: z.string().nullable().optional(),
                    expires_at: z.string().nullable().optional(),
                    updated_at: z.string().nullable().optional(),
                    workflow_run: z
                        .object({
                            id: z.number(),
                            repository_id: z.number(),
                            head_repository_id: z.number().optional(),
                            head_branch: z.string().nullable().optional(),
                            head_sha: z.string().optional()
                        })
                        .nullable()
                        .optional()
                })
            )
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const hasNextPage = providerResponse.total_count > page * perPage;

        return {
            artifacts: providerResponse.artifacts.map((artifact) => ({
                id: artifact.id,
                ...(artifact.node_id !== undefined && { node_id: artifact.node_id }),
                ...(artifact.name !== undefined && { name: artifact.name }),
                ...(artifact.size_in_bytes !== undefined && { size_in_bytes: artifact.size_in_bytes }),
                ...(artifact.url !== undefined && { url: artifact.url }),
                ...(artifact.archive_download_url !== undefined && { archive_download_url: artifact.archive_download_url }),
                ...(artifact.expired !== undefined && { expired: artifact.expired }),
                ...(artifact.created_at != null && { created_at: artifact.created_at }),
                ...(artifact.expires_at != null && { expires_at: artifact.expires_at }),
                ...(artifact.updated_at != null && { updated_at: artifact.updated_at }),
                ...(artifact.workflow_run != null && {
                    workflow_run: {
                        id: artifact.workflow_run.id,
                        repository_id: artifact.workflow_run.repository_id,
                        ...(artifact.workflow_run.head_repository_id !== undefined && { head_repository_id: artifact.workflow_run.head_repository_id }),
                        ...(artifact.workflow_run.head_branch != null && { head_branch: artifact.workflow_run.head_branch }),
                        ...(artifact.workflow_run.head_sha !== undefined && { head_sha: artifact.workflow_run.head_sha })
                    }
                })
            })),
            ...(hasNextPage && { next_cursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
