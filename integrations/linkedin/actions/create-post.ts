import { z } from 'zod';
import { createAction } from 'nango';

const DistributionSchema = z.object({
    feedDistribution: z.enum(['MAIN_FEED', 'NONE']).optional(),
    targetEntities: z.array(z.unknown()).optional(),
    thirdPartyDistributionChannels: z.array(z.string()).optional()
});

const ArticleContentSchema = z.object({
    source: z.string(),
    thumbnail: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional()
});

const MediaContentSchema = z.object({
    id: z.string(),
    title: z.string().optional()
});

const ContentSchema = z.object({
    article: ArticleContentSchema.optional(),
    media: MediaContentSchema.optional()
});

const ReshareContextSchema = z.object({
    parent: z.string()
});

const InputSchema = z.object({
    author: z.string().describe('Author URN. Example: "urn:li:organization:5515715"'),
    commentary: z.string().describe('Post commentary text.'),
    visibility: z.enum(['PUBLIC', 'CONNECTIONS']).describe('Post visibility.'),
    lifecycleState: z.enum(['PUBLISHED', 'DRAFT', 'PUBLISH_REQUESTED']).describe('Lifecycle state of the post.'),
    content: ContentSchema.optional(),
    reshareContext: ReshareContextSchema.optional(),
    isReshareDisabledByAuthor: z.boolean().optional(),
    distribution: DistributionSchema.optional()
});

const OutputSchema = z.object({
    id: z.string().describe('Created post URN.')
});

function extractPostIdFromDuplicateData(data: unknown): string | undefined {
    const dataRecord = typeof data === 'object' && data !== null ? data : {};
    const message = 'message' in dataRecord ? String(dataRecord.message) : '';
    const match = message.match(/duplicate of (urn:li:[^ ]+)/i);
    return match ? match[1] : undefined;
}

function extractPostIdFromError(error: unknown): string | undefined {
    const errorRecord = typeof error === 'object' && error !== null ? error : {};

    // AxiosError path
    const response = 'response' in errorRecord ? errorRecord.response : undefined;
    const responseRecord = typeof response === 'object' && response !== null ? response : {};
    const data = 'data' in responseRecord ? responseRecord.data : undefined;
    let postId = extractPostIdFromDuplicateData(data);
    if (postId) {
        return postId;
    }

    // Wrapped error path
    const payload = 'payload' in errorRecord ? errorRecord.payload : undefined;
    const payloadRecord = typeof payload === 'object' && payload !== null ? payload : {};
    postId = extractPostIdFromDuplicateData(payloadRecord);

    return postId;
}

const action = createAction({
    description: 'Publish an organic LinkedIn post for a member or organization.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-post',
        group: 'Posts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_member_social', 'w_organization_social'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const postBody: Record<string, unknown> = {
            author: input.author,
            commentary: input.commentary,
            visibility: input.visibility,
            lifecycleState: input.lifecycleState,
            distribution: {
                feedDistribution: input.distribution?.feedDistribution ?? 'MAIN_FEED',
                targetEntities: input.distribution?.targetEntities ?? [],
                thirdPartyDistributionChannels: input.distribution?.thirdPartyDistributionChannels ?? []
            },
            ...(input.isReshareDisabledByAuthor !== undefined && { isReshareDisabledByAuthor: input.isReshareDisabledByAuthor }),
            ...(input.content !== undefined && { content: input.content }),
            ...(input.reshareContext !== undefined && { reshareContext: input.reshareContext })
        };

        // @allowTryCatch: LinkedIn may return DUPLICATE_POST immediately if the post already exists.
        try {
            const response = await nango.post({
                // https://learn.microsoft.com/linkedin/marketing/community-management/shares/posts-api
                endpoint: '/rest/posts',
                data: postBody,
                headers: {
                    'Linkedin-Version': '202604',
                    'X-Restli-Protocol-Version': '2.0.0'
                },
                retries: 1
            });

            if (typeof response.status === 'number' && response.status >= 400) {
                const postId = extractPostIdFromDuplicateData(response.data);
                if (postId) {
                    return { id: postId };
                }
            }

            const postId = response.headers['x-restli-id'];
            if (typeof postId === 'string' && postId) {
                return { id: postId };
            }
        } catch (error) {
            const postId = extractPostIdFromError(error);
            if (postId) {
                return { id: postId };
            }
            throw error;
        }

        // The Nango proxy may strip the x-restli-id header on a successful 200/201 response.
        // Trigger a duplicate-post error to extract the real post ID from the error message.
        // @allowTryCatch: LinkedIn returns the post ID in the duplicate-post error message when the Nango proxy strips the x-restli-id header.
        try {
            const response = await nango.post({
                // https://learn.microsoft.com/linkedin/marketing/community-management/shares/posts-api
                endpoint: '/rest/posts',
                data: postBody,
                headers: {
                    'Linkedin-Version': '202604',
                    'X-Restli-Protocol-Version': '2.0.0'
                },
                retries: 1
            });

            if (typeof response.status === 'number' && response.status >= 400) {
                const postId = extractPostIdFromDuplicateData(response.data);
                if (postId) {
                    return { id: postId };
                }
            }

            const postId = response.headers['x-restli-id'];
            if (typeof postId === 'string' && postId) {
                return { id: postId };
            }
        } catch (error) {
            const postId = extractPostIdFromError(error);
            if (postId) {
                return { id: postId };
            }
            throw error;
        }

        throw new nango.ActionError({
            type: 'missing_post_id',
            message: 'Post was created but the post ID could not be determined.'
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
