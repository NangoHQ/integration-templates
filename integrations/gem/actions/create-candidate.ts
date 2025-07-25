import type { NangoAction, CreateCandidateInput, ProxyConfiguration, CreateCandidateOutput } from '../../models.js';
import type { CreateCandidate } from '../types.js';

export default async function runAction(nango: NangoAction, input: CreateCandidateInput): Promise<CreateCandidateOutput> {
    const proxyConfig: ProxyConfiguration = {
        // https://api.gem.com/ats/v0/reference#tag/Candidate/paths/~1ats~1v0~1candidates~1/post
        endpoint: '/ats/v0/candidates/',
        data: input,
        retries: 3
    };

    const { data } = await nango.post<CreateCandidate>(proxyConfig);
    return data;
}
