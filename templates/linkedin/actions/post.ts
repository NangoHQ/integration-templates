import { createAction } from "nango";
import { userInfo } from '../helpers/user-info.js';
import type { LinkedinCreatePost } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { CreateLinkedInPostWithVideoResponse, LinkedinVideoPost } from "../models.js";

const action = createAction({
    description: "Create a linkedin post with an optional video",
    version: "1.0.0",

    endpoint: {
        method: "POST",
        path: "/videos"
    },

    input: LinkedinVideoPost,
    output: CreateLinkedInPostWithVideoResponse,

    scopes: [
        "openid",
        "profile",
        "r_basicprofile",
        "w_member_social",
        "email",
        "w_organization_social",
        "r_organization_social"
    ],

    exec: async (nango, input): Promise<CreateLinkedInPostWithVideoResponse> => {
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
            retries: 3,
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
            succcess: response.status == 200
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
