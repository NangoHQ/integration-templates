import type { CreateLinkedInPostWithVideoResponse, NangoAction, LinkedinVideoPost } from '../../models';
import { createPostWithVideo } from '../helpers/post-video.js';
import { userInfo } from '../helpers/user-info.js';

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

    const resp = await createPostWithVideo(nango, ownerId, input.text, input.videoTitle, videoURN);

    return resp;
}
