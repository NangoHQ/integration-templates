import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive.'),
        repo: z.string().describe('The name of the repository. The name is not case sensitive.'),
        run_id: z.number().int().describe('The unique identifier of the workflow run.'),
        per_page: z.number().int().min(1).max(100).optional().describe('The number of results per page. Max 100.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
    })
    .describe('Input parameters to list artifacts for a workflow run.');

const ArtifactSchema = z.object({
    id: z.number().int().describe('Artifact ID.'),
    node_id: z.string().describe('Artifact node ID.'),
    name: z.string().describe('The name of the artifact.'),
    size_in_bytes: z.number().int().describe('The size of the artifact in bytes.'),
    url: z.string().describe('API URL for the artifact.'),
    archive_download_url: z.string().describe('URL to download the artifact archive.'),
    expired: z.boolean().describe('Whether the artifact has expired.'),
    created_at: z.string().describe('When the artifact was created.'),
    updated_at: z.string().describe('When the artifact was last updated.'),
    expires_at: z.string().optional().describe('When the artifact will expire.')
});

const OutputSchema = z
    .object({
        total_count: z.number().int().describe('Total number of artifacts in the workflow run.'),
        artifacts: z.array(ArtifactSchema).describe('List of artifacts produced by the workflow run.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page of results.')
    })
    .describe('List of artifacts produced by a workflow run.');

/**
 * @tags: [read]
 * @tagReason: Reads the list of artifacts from a workflow run without mutating any data.
 * @pitfalls: Artifacts expire after the repository's retention period and remain listed with `expired: true` but can no longer be downloaded.
 */
const action = createAction({
    description: 'List artifacts produced by a workflow run.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['actions:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid page number string.'
            });
        }

        // https://docs.github.com/rest/actions/artifacts#list-workflow-run-artifacts
        const response = await nango.get({
            endpoint: `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/runs/${encodeURIComponent(String(input.run_id))}/artifacts`,
            params: {
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                page: String(page)
            },
            retries: 3
        });

        const providerSchema = z.object({
            total_count: z.number(),
            artifacts: z.array(
                z.object({
                    id: z.number(),
                    node_id: z.string(),
                    name: z.string(),
                    size_in_bytes: z.number(),
                    url: z.string(),
                    archive_download_url: z.string(),
                    expired: z.boolean(),
                    created_at: z.string(),
                    updated_at: z.string(),
                    expires_at: z.string().optional()
                })
            )
        });

        const providerData = providerSchema.parse(response.data);

        let next_cursor: string | undefined;
        const linkHeader = response.headers['link'];
        if (typeof linkHeader === 'string') {
            const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
            if (nextMatch && nextMatch[1]) {
                const urlObj = new URL(nextMatch[1]);
                const nextPage = urlObj.searchParams.get('page');
                if (nextPage) {
                    next_cursor = nextPage;
                }
            }
        }

        return {
            total_count: providerData.total_count,
            artifacts: providerData.artifacts,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
