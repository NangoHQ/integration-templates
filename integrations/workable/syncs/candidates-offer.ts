import type { WorkableCandidateOffer, NangoSync, ProxyConfiguration } from '../../models';

const LIMIT = 100;

export default async function fetchData(nango: NangoSync) {
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

async function getAllCandidates(nango: NangoSync) {
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

async function getCandidateOffer(nango: NangoSync, candidateId: string) {
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
