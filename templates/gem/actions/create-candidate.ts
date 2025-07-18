import { createAction } from "nango";
import type { CreateCandidate } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { CreateCandidateOutput, CreateCandidateInput } from "../models.js";

const action = createAction({
    description: "Create a new candidate in Gem",
    version: "0.0.1",

    endpoint: {
        method: "POST",
        path: "/candidates",
        group: "Candidates"
    },

    input: CreateCandidateInput,
    output: CreateCandidateOutput,

    exec: async (nango, input): Promise<CreateCandidateOutput> => {
        const proxyConfig: ProxyConfiguration = {
            // https://api.gem.com/ats/v0/reference#tag/Candidate/paths/~1ats~1v0~1candidates~1/post
            endpoint: '/ats/v0/candidates/',
            data: input,
            retries: 3
        };

        const { data } = await nango.post<CreateCandidate>(proxyConfig);

        return data;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
