import type { NangoAction, ProxyConfiguration, UploadResumeResponse, UploadResumeInput } from '../../models.js';
import type { GemCandidateUploadResumeResponse } from '../types.js';

export default async function runAction(nango: NangoAction, input: UploadResumeInput): Promise<UploadResumeResponse> {
    const proxyConfig: ProxyConfiguration = {
        // https://api.gem.com/v0/reference#tag/Candidate-Uploaded-Resumes/paths/~1v0~1candidates~1%7Bcandidate_id%7D~1uploaded_resumes~1%7Buser_id%7D/post
        endpoint: `/v0/candidates/${input.candidate_id}/uploaded_resumes/${input.user_id}`,
        data: input.resume_file,
        headers: {
            'content-type': 'application/json'
        },
        retries: 3
    };

    const { data } = await nango.post<GemCandidateUploadResumeResponse>(proxyConfig);
    return data;
}
