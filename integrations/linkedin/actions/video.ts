
import type { CreateLinkedInPostWithVideoResponse, NangoAction, ProxyConfiguration, LinkedinVideoPost } from '../../models';
import { LinkedinCreatePost } from '../types.js';

export default async function runAction(nango: NangoAction, input: LinkedinVideoPost) {
    const videoURN = input.videoURN
    const getUserId = input.ownerId
    await createPostWithVideo(nango, getUserId, input.linkedinPostText, input.postTtile, videoURN);

}
async function createPostWithVideo(nango: NangoAction, author: string, postText: string, videoTitle: string, videoURN: string): Promise<CreateLinkedInPostWithVideoResponse> {
    const postData: LinkedinCreatePost = {
        author: `urn:li:person:${author}`,
        commentary: postText,
        visibility: 'PUBLIC',
        distribution: {
            feedDistribution: 'MAIN_FEED',
            targetEntities: [],
            thirdPartyDistributionChannels: []
        },
        content: {
            media: {
            title: videoTitle,
            // video that is already uploaded to linkedin api. this id can be video, image or document urn.
            id: videoURN
            }
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false
    }

    // https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2024-10&tabs=http        endpoint: `/rest/posts`,
    const config: ProxyConfiguration = {
        retries: 10,
        data: postData,
        endpoint: `/rest/posts`
    }

    const response = await nango.post(config);

    if (response.status !== 201) {
        throw new nango.ActionError({
            message: `failed to create post with video urn ${videoURN}`
        });
    }

    return {
        succcess: response.status == 201 ? true : false,
        postId: response.headers["x-restli-id"]
    }
}
