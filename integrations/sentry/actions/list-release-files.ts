import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the Sentry organization the release belongs to. Example: "my-org-slug"'),
        version: z.string().describe('The version identifier of the release (the version string, not the numeric release id). Example: "1.0.0"'),
        cursor: z.string().min(1).optional().describe('Opaque pagination cursor returned as nextCursor by a previous call. Omit for the first page.')
    })
    .describe('Parameters identifying the organization and release version whose files should be listed.');

const ReleaseFileSchema = z
    .object({
        id: z.string().describe('Unique identifier of the release file.'),
        name: z.string().describe('Name (path) of the uploaded file, e.g. a source map or other release artifact.'),
        dist: z.string().optional().describe('Distribution the file is associated with. Omitted when the file is not associated with a distribution.'),
        headers: z.record(z.string(), z.unknown()).describe('Additional headers associated with the file, e.g. a Sourcemap reference.'),
        size: z.number().describe('Size of the file in bytes.'),
        sha1: z.string().describe('SHA1 checksum of the file contents.'),
        dateCreated: z.string().describe('ISO 8601 timestamp of when the file was uploaded.')
    })
    .describe('A single file uploaded for the release.');

const OutputSchema = z
    .object({
        files: z.array(ReleaseFileSchema).describe('Files uploaded for the release. Empty when no files have been uploaded.'),
        nextCursor: z.string().optional().describe('Cursor to pass as the cursor input to fetch the next page. Omitted when there are no more pages.')
    })
    .describe('Files uploaded for the release plus the cursor for the next page.');

const ProviderReleaseFileSchema = z.object({
    id: z.string(),
    name: z.string(),
    dist: z.string().nullable(),
    headers: z.record(z.string(), z.unknown()),
    size: z.number(),
    sha1: z.string(),
    dateCreated: z.string()
});

function parseNextCursor(linkHeader: string): string | undefined {
    for (const part of linkHeader.split(',')) {
        if (!part.includes('rel="next"')) {
            continue;
        }
        if (!part.includes('results="true"')) {
            return undefined;
        }
        const cursorMatch = /cursor="([^"]+)"/.exec(part);
        return cursorMatch ? cursorMatch[1] : undefined;
    }
    return undefined;
}

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET against Sentry to list release files; it does not mutate any provider data.
 * @pitfalls: The release is identified by its version string, not its numeric id. The connection's API token must have one of the org:ci, project:admin, project:read, project:releases, or project:write scopes, otherwise the call fails with a 403 error.
 */
const action = createAction({
    description: 'List source/asset files uploaded for a release.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['org:ci', 'project:admin', 'project:read', 'project:releases', 'project:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/releases/list-an-organizations-release-files/
        const response = await nango.get({
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/releases/${encodeURIComponent(input.version)}/files/`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        });

        const files = z.array(ProviderReleaseFileSchema).parse(response.data);

        const linkHeader: unknown = response.headers['link'];
        const nextCursor = typeof linkHeader === 'string' ? parseNextCursor(linkHeader) : undefined;

        return {
            files: files.map((file) => ({
                id: file.id,
                name: file.name,
                ...(file.dist != null && { dist: file.dist }),
                headers: file.headers,
                size: file.size,
                sha1: file.sha1,
                dateCreated: file.dateCreated
            })),
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
