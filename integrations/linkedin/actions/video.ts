
import type { CreateLinkedInPostWithVideoResponse, NangoAction, LinkedinVideoPost } from '../../models';
import { createPostWithVideo } from "../helpers/postVideo"

export default async function runAction(nango: NangoAction, input: LinkedinVideoPost): Promise<CreateLinkedInPostWithVideoResponse> {
    const videoURN = input.videoURN;
    const getUserId = input.ownerId;

    if (!videoURN.startsWith('urn')) {
        throw new nango.ActionError({
            message: `invalid video urn`
        });
    }

    const resp = await createPostWithVideo(nango, getUserId, input.linkedinPostText, input.postTtile, videoURN);
    return resp;
}
