// export interface LinkedinVideoPost {
//     linkedinPostText: string;
//     videoFilePath: string;
//     postTtile: string;
// }

export interface LinkedInProfileRespose {
    initializeUploadRequest: {
    owner: string,
    fileSizeBytes: number ,
    uploadCaptions: boolean,
    uploadThumbnail: boolean
    }
}

export interface LinkedInInitializeVideoUploadResponse {
    value: {
        uploadUrlsExpireAt: number,
        video: string,
        uploadInstructions: uploadParams[]
        uploadToken: string
    }
}

export interface uploadParams {
    uploadUrl: string
    lastByte: number,
    firstByte: number
}

// can be used for video, document or images. 
export interface LinkedinCreatePostWithVideo {
    author: string,
    commentary: string,
    visibility: LinkedinVisibility,
    distribution: {
        feedDistribution: LinkedinFeed,
        targetEntities: any[],
        thirdPartyDistributionChannels: any[]
    },
    content: {
        media: {
            title:string,
            id: string,
        }
    },
    lifecycleState: PostLifeCycle,
    isReshareDisabledByAuthor: boolean
}

type PostLifeCycle = "PUBLISHED"
type LinkedinFeed = "MAIN_FEED"
type LinkedinVisibility = "PUBLIC"
