import { createSync } from "nango";
import type { ProxyConfiguration } from "nango";
import { WorkableCandidateOffer } from "../models.js";
import { z } from "zod";

const LIMIT = 100;

const sync = createSync({
    description: "Fetches candidate's latest offer from workable",
    version: "1.0.0",
    frequency: "every 6 hours",
    autoStart: true,
    syncType: "full",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/workable/candidates-offer"
    }],

    scopes: ["r_candidates"],

    models: {
        WorkableCandidateOffer: WorkableCandidateOffer
    },

    metadata: z.object({}),

    exec: async nango => {
        let totalRecords = 0;

        const candidates: any[] = await getAllCandidates(nango);

        for (const candidate of candidates) {
            const offer = await getCandidateOffer(nango, candidate.id);

            if (offer) {
                const mappedOffer: WorkableCandidateOffer = mapOffer(offer);

                totalRecords++;
                await nango.log(`Saving offer for candidate ${candidate.id} (total offers: ${totalRecords})`);
                await nango.batchSave([mappedOffer], 'WorkableCandidateOffer');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

async function getAllCandidates(nango: NangoSyncLocal) {
    const records: any[] = [];
    const proxyConfig: ProxyConfiguration = {
        // https://workable.readme.io/reference/job-candidates-index
        endpoint: '/spi/v3/candidates',
        paginate: {
            type: 'link',
            link_path_in_response_body: 'paging.next',
            limit_name_in_request: 'limit',
            response_path: 'candidates',
            limit: LIMIT
        }
    };

    for await (const recordBatch of nango.paginate(proxyConfig)) {
        records.push(...recordBatch);
    }

    return records;
}

async function getCandidateOffer(nango: NangoSyncLocal, candidateId: string) {
    const endpoint = `/spi/v3/candidates/${candidateId}/offer`;

    //candidate's latest offer
    const offer = await nango.get({ endpoint, retries: 10 });
    return mapOffer(offer.data);
}

function mapOffer(offer: any): WorkableCandidateOffer {
    return {
        id: offer.candidate.id,
        candidate: offer.candidate,
        created_at: offer.created_at,
        document_variables: offer.document_variables,
        documents: offer.documents,
        state: offer.state
    };
}
