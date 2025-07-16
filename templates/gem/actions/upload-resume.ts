import { createAction } from "nango";
import type { GemCandidateUploadResumeResponse } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { UploadResumeResponse, UploadResumeInput } from "../models.js";

const action = createAction({
    description: "Upload a resume for a candidate. Allowed formats are .pdf, .doc, or .docx. The file size must not exceed 10MB.",
    version: "0.0.1",

    endpoint: {
        method: "POST",
        path: "/candidate-upload-resume",
        group: "Candidates"
    },

    input: UploadResumeInput,
    output: UploadResumeResponse,

    exec: async (nango, input): Promise<UploadResumeResponse> => {
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
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
