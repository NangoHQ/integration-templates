export interface LinkedInProfileRespose {
    initializeUploadRequest: {
        owner: string;
        fileSizeBytes: number;
        uploadCaptions: boolean;
        uploadThumbnail: boolean;
    };
}

export interface LinkedInInitializeVideoUploadResponse {
    value: {
        uploadUrlsExpireAt: number;
        video: string;
        uploadInstructions: uploadParams[];
        uploadToken: string;
    };
}

export interface uploadParams {
    uploadUrl: string;
    lastByte: number;
    firstByte: number;
}

export interface LinkedInUserInfo {
  sub: string;
  email_verified: boolean;
  name: string;
  locale: { 
      country: string; 
      language: string;
  };
  given_name: string;
  family_name: string;
  email: string;
  picture: string;
}

export interface LinkedinCreatePost {
    author: string;
    commentary: string;
    visibility: LinkedinVisibility;
    distribution: {
        feedDistribution: LinkedinFeed;
        targetEntities: any[];
        thirdPartyDistributionChannels: any[];
    };
    content?: {
        media: {
            title: string;
            // can be used for video, document or image urn
            id: string;
        };
    };
    lifecycleState: PostLifeCycle;
    isReshareDisabledByAuthor: boolean;
}

type PostLifeCycle = 'PUBLISHED';
type LinkedinFeed = 'MAIN_FEED' | 'NONE';
type LinkedinVisibility = 'PUBLIC' | 'CONTAINER' | 'LOGGED_IN' | 'CONNECTIONS';
