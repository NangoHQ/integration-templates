import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CandidateSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const OfferResponseSchema = z
    .object({
        candidate: z
            .object({
                id: z.string(),
                name: z.string().optional()
            })
            .optional(),
        state: z.string().optional(),
        created_at: z.string().optional(),
        documents: z.array(z.object({}).passthrough()).optional(),
        document_variables: z.array(z.unknown()).optional()
    })
    .passthrough();

const CandidateOfferSchema = z.object({
    id: z.string(),
    candidate_id: z.string(),
    candidate_name: z.string().optional(),
    state: z.string().optional(),
    created_at: z.string().optional(),
    documents: z.array(z.object({}).passthrough()).optional(),
    document_variables: z.array(z.unknown()).optional()
});

const CheckpointSchema = z.object({
    next_page: z.string()
});

const sync = createSync({
    description: "Sync each candidate's latest offer, where one exists.",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CandidateOffer: CandidateOfferSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse(rawCheckpoint ?? { next_page: '' });
        let nextPage: string | undefined = checkpoint.next_page || undefined;

        const params: Record<string, string | number> = {
            limit: 100
        };

        if (checkpoint.next_page) {
            const nextUrl = new URL(checkpoint.next_page);
            for (const [key, value] of nextUrl.searchParams.entries()) {
                params[key] = value;
            }
            if (!('limit' in params)) {
                params['limit'] = 100;
            }
        }

        await nango.trackDeletesStart('CandidateOffer');

        const proxyConfig: ProxyConfiguration = {
            // https://workable.readme.io/reference/list-candidates
            endpoint: '/spi/v3/candidates',
            params,
            paginate: {
                type: 'link',
                link_path_in_response_body: 'paging.next',
                response_path: 'candidates',
                limit: 100,
                limit_name_in_request: 'limit',
                on_page: async ({ nextPageParam }) => {
                    nextPage = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retryOn: [404, 429],
            retries: 3
        };

        for await (const candidates of nango.paginate(proxyConfig)) {
            const parsedCandidates = z.array(CandidateSchema).safeParse(candidates);
            if (!parsedCandidates.success) {
                throw new Error(`Failed to parse candidates: ${parsedCandidates.error.message}`);
            }

            const offers: Array<z.infer<typeof CandidateOfferSchema>> = [];
            for (const candidate of parsedCandidates.data) {
                const offerResponse = await getWithReadBackoff(nango, {
                    // https://workable.readme.io/reference/get-candidate-offer
                    endpoint: `/spi/v3/candidates/${encodeURIComponent(candidate.id)}/offer`,
                    retries: 3
                });

                const parsedOffer = OfferResponseSchema.safeParse(offerResponse.data);
                if (!parsedOffer.success) {
                    throw new Error(`Failed to parse offer for candidate ${candidate.id}: ${parsedOffer.error.message}`);
                }

                const offerData = parsedOffer.data;
                if (offerData.state !== undefined && offerData.state !== null) {
                    offers.push({
                        id: candidate.id,
                        candidate_id: candidate.id,
                        candidate_name: candidate.name,
                        state: offerData.state,
                        created_at: offerData.created_at,
                        documents: offerData.documents,
                        document_variables: offerData.document_variables
                    });
                }
            }

            if (offers.length > 0) {
                await nango.batchSave(offers, 'CandidateOffer');
            }

            if (nextPage) {
                await nango.saveCheckpoint({ next_page: nextPage });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('CandidateOffer');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];

function getErrorStatus(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') {
        return undefined;
    }
    if ('status' in error && typeof error.status === 'number') {
        return error.status;
    }
    if ('response' in error && typeof error.response === 'object' && error.response !== null && 'status' in error.response) {
        const status = error.response.status;
        return typeof status === 'number' ? status : undefined;
    }
    return undefined;
}

async function getWithReadBackoff(nango: NangoSyncLocal, config: ProxyConfiguration) {
    const requestConfig: ProxyConfiguration = { ...config, retries: 3 };
    // @allowTryCatch Back off on 429 and retry spurious 404s for Workable read calls.
    try {
        const response = await nango.get(requestConfig);
        if (response.status === 429) {
            await new Promise((resolve) => setTimeout(resolve, 10000));
            return await nango.get(requestConfig);
        }
        if (response.status === 404) {
            return await nango.get(requestConfig);
        }
        return response;
    } catch (error) {
        const status = getErrorStatus(error);
        if (status === 429) {
            await new Promise((resolve) => setTimeout(resolve, 10000));
            return await nango.get(requestConfig);
        }
        if (status === 404) {
            return await nango.get(requestConfig);
        }
        throw error;
    }
}

export default sync;
