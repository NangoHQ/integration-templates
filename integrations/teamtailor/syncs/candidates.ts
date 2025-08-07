import type { NangoSync, TeamtailorCandidate } from '../../models.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    let totalRecords = 0;

    const endpoint = '/v1/candidates';
    const config = {
        paginate: {
            type: 'link',
            link_path_in_response_body: 'links.next',
            limit_name_in_request: 'page[size]',
            response_path: 'data',
            limit: 30
        }
    };
    for await (const candidate of nango.paginate({ ...config, endpoint })) {
        const mappedCandidate: TeamtailorCandidate[] = candidate.map(mapCandidate) || [];

        const batchSize: number = mappedCandidate.length;
        totalRecords += batchSize;
        await nango.log(`Saving batch of ${batchSize} candidate(s) (total candidate(s): ${totalRecords})`);
        await nango.batchSave(mappedCandidate, 'TeamtailorCandidate');
    }
}

function mapCandidate(candidate: any): TeamtailorCandidate {
    return {
        id: candidate.id,
        type: candidate.type,
        links: candidate.links,
        attributes: candidate.attributes,
        relationships: candidate.relationships
    };
}
