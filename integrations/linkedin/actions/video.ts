import type { CreateLinkedInPostWithVideoResponse, NangoAction, ProxyConfiguration, LinkedinVideoPost } from '../../models';
import { LinkedinCreatePostWithVideo, LinkedInInitializeVideoUploadResponse, uploadParams } from '../types';
import fs from 'fs';
import axios from 'axios';

export default async function runAction(nango: NangoAction, input: LinkedinVideoPost) {
    // const parsedInput = oktaAssignRemoveUserGroupSchema.safeParse(input);

    const fileSizeBytes = fs.statSync(input.videoFilePath).size;

    if (fileSizeBytes > 500 * 1024 * 1024) { // 500 MB
        throw new nango.ActionError({
            message: 'file large than 500 MB'
        });
    }
    const getUserId = await getLinkedInId(nango);
    const initializeUpload = await initializeVideoUpload(nango, getUserId, fileSizeBytes);
    const videoURN = initializeUpload.value.video;
    const videoUpload =  await uploadVideo(nango, input.videoFilePath, initializeUpload.value.uploadInstructions);

    // video uploaded
    const resp = await finalizeUpload(nango, videoURN, videoUpload);

    // create post with video
    if (resp.status == 200) {
        await createPostWithVideo(nango, getUserId, input.linkedinPostText, input.postTtile, videoURN);
    }
}

/**
 * 
 * @param nango instance of nango
 * @returns id. The id returned in the response is the unique identifier of the user. Can also be referred to as person ID.
 */
async function getLinkedInId(nango: NangoAction): Promise<string> {
    const config: ProxyConfiguration = {
        // https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/profile-api
        endpoint: `/v2/me`,
        retries: 10
    }
    const response = await nango.get(config);
    return response.data.id
}

/**
 * 
 * @param nango instance of nango
 * @param owner the user initialising the upload
 * @param bytesfilesize the file size of the video to be uploaded
 * @returns 
 */
async function initializeVideoUpload(nango: NangoAction, owner: string, bytesfilesize: number): Promise<LinkedInInitializeVideoUploadResponse> {
    const endpoint = `/rest/videos?action=initializeUpload`

    const postData = { 
        initializeUploadRequest: {
            owner: `urn:li:organization:${owner}`,
            fileSizeBytes: bytesfilesize ,
            uploadCaptions: false,
            uploadThumbnail: false
        }
    }

    const response = await nango.post({
        endpoint: endpoint,
        data: postData,
        retries: 10,
    })
    return response.data
}

/**
 * 
 * @param nango 
 * @param videoFilePath file path of video file
 * @param uploadUrl url to upload video
 * @returns 
 */
async function uploadVideo(nango: NangoAction, videoFilePath: string, params: uploadParams[]): Promise<string[]> {
    const fileStream = fs.createReadStream(videoFilePath);
    const eTags: string[] = [];
    try {
        for (const url of params) {
            const response = await axios.put(url.uploadUrl, fileStream, {
                headers: {
                    'Content-Type': 'application/octet-stream',
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
            eTags.push(response.headers['etag']);
        }
        return eTags;
    } catch (e: any) {
        await nango.log(`unable to upload linkedin vide because of error: ${e.message}`);
        return [];
    }
}

async function finalizeUpload(nango: NangoAction, videoURN: string, etags: string[]) {
    const postData = {
        finalizeUploadRequest: {
          video: videoURN,
          uploadToken: '',
          uploadedPartIds: etags
        }
    }

    const config: ProxyConfiguration = {
        // https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api?view=li-lms-2024-10&tabs=http#finalize-video-upload
        endpoint: `/rest/videos?action=finalizeUpload`,
        retries: 10,
        data: postData
    }
    const response = await nango.post(config);

    // A successful response returns the 200 OK status code.
    if (response.status !== 200) {
        await nango.log(`uploading video with urn ${videoURN} was not successful`);
    }

    return response.data;
}

async function createPostWithVideo(nango: NangoAction, author: string, postText: string, videoTitle: string, videoURN: string): Promise<CreateLinkedInPostWithVideoResponse> {
    const postData: LinkedinCreatePostWithVideo = {
        author: `urn:li:organization:${author}`,
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

    const config: ProxyConfiguration = {
        // https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2024-10&tabs=http        endpoint: `/rest/posts`,
        retries: 10,
        data: postData
    }

    const response = await nango.post(config);

    if (response.status !== 201) {
        await nango.log(`failed to create post with video urn ${videoURN}`);
    }

    return {
        succcess: response.status == 201 ? true : false
    }
}
