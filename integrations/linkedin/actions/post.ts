import type { CreateLinkedInPostWithVideoResponse, LinkedinVideoPost, NangoAction, ProxyConfiguration } from '../../models.js';
import { userInfo } from '../helpers/user-info.js';
import type { LinkedinCreatePost } from '../types.js';

export default async function runAction(nango: NangoAction, input: LinkedinVideoPost): Promise<CreateLinkedInPostWithVideoResponse> {
    const videoURN = input?.videoURN;
    let ownerId = input?.ownerId;

    if (!ownerId) {
        const me = await userInfo(nango);
        ownerId = me.sub;
    }

    if (videoURN && !videoURN.startsWith('urn')) {
        throw new nango.ActionError({
            message: `invalid video urn`
        });
    }

    const postData: LinkedinCreatePost = {
        author: `urn:li:person:${ownerId}`,
        commentary: input.text,
        visibility: 'PUBLIC',
        distribution: {
            feedDistribution: 'MAIN_FEED',
            targetEntities: [],
            thirdPartyDistributionChannels: []
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false
    };

    if (videoURN) {
        postData.content = {
            media: {
                title: input.videoTitle,
                // video that is already uploaded to linkedin api. this id can be video, image or document urn.
                id: videoURN
            }
        };
    }

    const config: ProxyConfiguration = {
        // https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2024-10&tabs=http
        endpoint: `/rest/posts`,
        retries: 10,
        data: postData,
        headers: {
            'LinkedIn-Version': '202405'
        }
    };

    const response = await nango.post(config);

    if (response.status !== 200) {
        throw new nango.ActionError({
            message: `failed to create post with video urn ${videoURN}`
        });
    }

    return {
        succcess: response.status == 200 ? true : false
    };
}
