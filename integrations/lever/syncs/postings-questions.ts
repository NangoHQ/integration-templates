import type { LeverPostingApply, NangoSync, ProxyConfiguration } from '../../models.js';

const LIMIT = 100;

export default async function fetchData(nango: NangoSync) {
    let totalRecords = 0;

    const postings: any[] = await getAllPostings(nango);

    for (const posting of postings) {
        const apply = await getPostingApply(nango, posting.id);
        if (apply) {
            const mappedApply: LeverPostingApply = mapApply(apply);

            totalRecords++;
            await nango.log(`Saving apply for posting ${posting.id} (total applie(s): ${totalRecords})`);
            await nango.batchSave([mappedApply], 'LeverPostingApply');
        }
    }
}

async function getAllPostings(nango: NangoSync) {
    const records: any[] = [];
    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#list-all-postings
        endpoint: '/v1/postings',
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'next',
            cursor_name_in_request: 'offset',
            limit_name_in_request: 'limit',
            response_path: 'data',
            limit: LIMIT
        }
    };

    for await (const recordBatch of nango.paginate(config)) {
        records.push(...recordBatch);
    }

    return records;
}

async function getPostingApply(nango: NangoSync, postingId: string) {
    // https://hire.lever.co/developer/documentation#apply-to-a-posting
    const endpoint = `/v1/postings/${postingId}/apply`;
    const apply = await nango.get({ endpoint, retries: 10 });
    return mapApply(apply.data.data);
}

function mapApply(apply: any): LeverPostingApply {
    return {
        id: apply.id,
        text: apply.text,
        customQuestions: apply.customQuestions,
        eeoQuestions: apply.eeoQuestions,
        personalInformation: apply.personalInformation,
        urls: apply.urls
    };
}
