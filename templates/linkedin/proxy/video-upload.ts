import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { Nango } from '@nangohq/node';

const nango = new Nango({ secretKey: String(process.env['NANGO_SECRET_KEY']) });

const connectionId = process.env['LINKEDIN_CONNECTION_ID'] || 'linkedin';
const providerConfigKey = process.env['LINKEDIN_PROVIDER_CONFIG_KEY'] ?? 'linkedin';

async function run() {
    const videoFilePath = process.env['VIDEO_FILE_PATH'];
    if (!videoFilePath) {
        throw new Error('VIDEO_FILE_PATH environment variable is required');
    }

    const fileSizeBytes = fs.statSync(videoFilePath).size;

    if (fileSizeBytes > 500 * 1024 * 1024) {
        // 500 MB, max file size linkedin
        console.error('File size exceeds 500 MB');
        return;
    }

    if (!isMp4(videoFilePath)) {
        console.error('Video file must be in MP4 format');
        return;
    }

    const userId = await getLinkedInId();
    const initializeUploadResponse = await initializeVideoUpload(userId, fileSizeBytes);
    const videoURN = initializeUploadResponse.value.video;
    const uploadToken = initializeUploadResponse.value.uploadToken;

    const etags = await uploadVideo(videoFilePath, initializeUploadResponse.value.uploadInstructions);

    // Video uploaded
    await finalizeUpload(videoURN, etags, uploadToken);

    console.log('video urn => ', videoURN);
}

async function initializeVideoUpload(owner: string, bytesFileSize: number) {
    const postData = {
        initializeUploadRequest: {
            owner: `urn:li:person:${owner}`,
            fileSizeBytes: bytesFileSize,
            uploadCaptions: false,
            uploadThumbnail: false
        }
    };

    const config = {
        endpoint: '/rest/videos',
        retries: 2,
        params: {
            action: 'initializeUpload'
        },
        providerConfigKey,
        connectionId,
        headers: {
            'LinkedIn-Version': '202405'
        },
        data: postData
    };

    const response = await nango.post(config);

    return response.data;
}

async function uploadVideo(videoFilePath: string, uploadInstructions: { uploadUrl: string }[]) {
    const eTags = [];
    const fileStream = fs.createReadStream(videoFilePath); // Create the stream once
    const connection = await nango.getConnection(providerConfigKey, connectionId);
    const [uploadInstruction] = uploadInstructions;
    if (!uploadInstruction) {
        console.error('No upload instructions found');
        return [];
    }

    const token = connection.credentials.accessToken;
    // @allowTryCatch
    try {
        const uploadUrl = uploadInstruction?.uploadUrl;
        const response = await axios.put(uploadUrl, fileStream, {
            headers: {
                'Content-Type': 'application/octet-stream',
                Authorization: `Bearer ${token}`,
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': '202405'
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        eTags.push(response.headers['etag']);

        return eTags;
    } catch (e: any) {
        console.error(`Unable to upload video to LinkedIn due to error: ${e.message}`);
        return [];
    } finally {
        fileStream.close();
    }
}

async function finalizeUpload(videoURN: string, etags: string[], uploadToken: string) {
    const postData = {
        finalizeUploadRequest: {
            video: videoURN,
            uploadToken,
            uploadedPartIds: etags
        }
    };

    const config = {
        endpoint: '/rest/videos',
        params: {
            action: 'finalizeUpload'
        },
        providerConfigKey,
        connectionId,
        data: postData,
        headers: {
            'LinkedIn-Version': '202405',
            'X-Restli-Protocol-Version': '2.0.0'
        },
        retries: 2
    };

    const response = await nango.post(config);

    // A successful response returns the 200 OK status code.
    if (response.status !== 200) {
        console.error(`Uploading video with URN ${videoURN} was not successful`);
        return;
    }

    if (response.status == 200) {
        console.log(response.status, 'completed uploading video');
    }

    return response.data;
}

function isMp4(filePath: string) {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.mp4';
}

async function getLinkedInId() {
    const config = {
        endpoint: '/v2/userinfo',
        retries: 10,
        providerConfigKey,
        connectionId,
        headers: {
            'LinkedIn-Version': '202405'
        }
    };

    const response = await nango.get(config);

    return response.data.sub;
}

await run();
