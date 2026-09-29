import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. Example: "octocat".'),
        repo: z.string().describe('The name of the repository without the .git extension. Example: "hello-world".'),
        tag: z.string().describe('The tag name, typically a version. Example: "v0.0.1".'),
        message: z.string().describe('The tag message. Example: "initial version".'),
        object: z.string().describe('The SHA of the git object this is tagging. Example: "c3d0be41ecbe669545ee3e94d31ed9a4bc91ee3c".'),
        type: z.enum(['commit', 'tree', 'blob']).describe('The type of the git object being tagged. Normally "commit", but it can also be "tree" or "blob".'),
        tagger: z
            .object({
                name: z.string().describe('The name of the author of the tag. Example: "Monalisa Octocat".'),
                email: z.string().describe('The email of the author of the tag. Example: "octocat@github.com".'),
                date: z
                    .string()
                    .optional()
                    .describe('When this object was tagged, as an ISO 8601 timestamp (YYYY-MM-DDTHH:MM:SSZ). Example: "2024-01-15T10:30:00Z".')
            })
            .optional()
            .describe('Information about the individual creating the tag. Defaults to the authenticated user when omitted.')
    })
    .describe('Parameters for creating an annotated git tag object.');

const ProviderTaggerSchema = z.object({
    name: z.string(),
    email: z.string(),
    date: z.string()
});

const ProviderTagSchema = z.object({
    node_id: z.string(),
    tag: z.string(),
    sha: z.string(),
    url: z.string(),
    message: z.string(),
    tagger: ProviderTaggerSchema,
    object: z.object({
        type: z.string(),
        sha: z.string(),
        url: z.string()
    }),
    verification: z.object({
        verified: z.boolean(),
        reason: z.string(),
        signature: z.string().nullable(),
        payload: z.string().nullable(),
        verified_at: z.string().nullable()
    })
});

const OutputSchema = z
    .object({
        node_id: z.string().describe('The node ID of the created tag object.'),
        tag: z.string().describe('The name of the created tag.'),
        sha: z.string().describe('The SHA of the created tag object.'),
        url: z.string().describe('The API URL of the created tag object.'),
        message: z.string().describe('The tag message.'),
        tagger: z
            .object({
                name: z.string().describe('The name of the author of the tag.'),
                email: z.string().describe('The email of the author of the tag.'),
                date: z.string().describe('When the tag object was created, as an ISO 8601 timestamp.')
            })
            .describe('Information about the individual who created the tag.'),
        object: z
            .object({
                type: z.string().describe('The type of the tagged git object.'),
                sha: z.string().describe('The SHA of the tagged git object.'),
                url: z.string().describe('The API URL of the tagged git object.')
            })
            .describe('The git object that was tagged.'),
        verification: z
            .object({
                verified: z.boolean().describe('Whether GitHub considers the tag signature to be verified.'),
                reason: z.string().describe('The reason for the verification result, e.g. "unsigned" or "valid".'),
                signature: z.string().optional().describe('The signature extracted from the tag, if present.'),
                payload: z.string().optional().describe('The value that was signed, if present.'),
                verified_at: z.string().optional().describe('The date the signature was verified by GitHub, as an ISO 8601 timestamp.')
            })
            .describe('The result of verifying the tag object signature.')
    })
    .describe('The created annotated git tag object.');

/**
 * @tags: [write]
 * @tagReason: Creates an annotated git tag object in the repository.
 * @pitfalls: Creating a tag object does not create the refs/tags/{tag} reference, so no tag appears in the repository until that reference is created separately; only annotated tag objects are supported, not lightweight tags. When tagger is omitted, GitHub stamps the current time, so identical inputs can return a different tag SHA on each call.
 */
const action = createAction({
    description: 'Create an annotated git tag object for a commit or object SHA.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.github.com/en/rest/git/tags#create-a-tag-object
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/git/tags`,
            data: {
                tag: input.tag,
                message: input.message,
                object: input.object,
                type: input.type,
                ...(input.tagger !== undefined && {
                    tagger: {
                        name: input.tagger.name,
                        email: input.tagger.email,
                        ...(input.tagger.date !== undefined && { date: input.tagger.date })
                    }
                })
            },
            retries: 3
        };
        const response = await nango.post(config);

        const createdTag = ProviderTagSchema.parse(response.data);

        return {
            node_id: createdTag.node_id,
            tag: createdTag.tag,
            sha: createdTag.sha,
            url: createdTag.url,
            message: createdTag.message,
            tagger: {
                name: createdTag.tagger.name,
                email: createdTag.tagger.email,
                date: createdTag.tagger.date
            },
            object: {
                type: createdTag.object.type,
                sha: createdTag.object.sha,
                url: createdTag.object.url
            },
            verification: {
                verified: createdTag.verification.verified,
                reason: createdTag.verification.reason,
                ...(createdTag.verification.signature != null && { signature: createdTag.verification.signature }),
                ...(createdTag.verification.payload != null && { payload: createdTag.verification.payload }),
                ...(createdTag.verification.verified_at != null && { verified_at: createdTag.verification.verified_at })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
