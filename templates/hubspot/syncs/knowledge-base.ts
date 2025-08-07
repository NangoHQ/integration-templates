import { createSync } from "nango";
import { HubspotKnowledgeBase } from "../models.js";
import { z } from "zod";

interface HubspotDetailsResponse {
    portalId: number;
    timeZone: string;
    accountType: string;
    currency: string;
    utcOffset: string;
    utcOffsetMilliseconds: number;
}

interface HubspotKnowledgeBaseResponse {
    id: number;
    type: string;
    fields: any;
}

async function* fetchPaginatedData(nango: NangoSyncLocal, portalId: number, limit = 50) {
    let offset = 0;

    // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
    while (true) {
        const response = await nango.get({
            endpoint: '/contentsearch/v2/search',
            params: {
                type: 'KNOWLEDGE_ARTICLE',
                term: 'a_b_c_d_e_f_g_h_i_j_k_l_m_n_o_p_q_r_s_t_u_v_w_x_y_z',
                portalId: portalId.toString(),
                limit: limit.toString(),
                offset: offset.toString()
            },
            retries: 10
        });

        if (!response.data || response.data.total === 0) {
            return;
        }

        yield response.data.results;

        if (response.data.total <= offset + limit) {
            return;
        }

        offset += limit;
    }
}

const sync = createSync({
    description: "Fetches a list of knowledge base from Hubspot",
    version: "2.0.0",
    frequency: "every day",
    autoStart: true,
    syncType: "full",
    trackDeletes: true,

    endpoints: [{
        method: "GET",
        path: "/knowledge-base"
    }],

    models: {
        HubspotKnowledgeBase: HubspotKnowledgeBase
    },

    metadata: z.object({}),

    exec: async nango => {
        const portalResponse = await nango.get<HubspotDetailsResponse>({
            endpoint: '/integrations/v1/me',
            retries: 10
        });

        if (!portalResponse.data || !portalResponse.data.portalId) {
            throw new Error('No portal id found');
        }

        for await (const pageData of fetchPaginatedData(nango, portalResponse.data.portalId)) {
            const kbs: HubspotKnowledgeBase[] = [];
            for (const result of pageData) {
                const response = await nango.get<HubspotKnowledgeBaseResponse>({
                    endpoint: `/cms/v3/site-search/indexed-data/${result.id}`,
                    params: {
                        type: 'KNOWLEDGE_ARTICLE'
                    },
                    retries: 10
                });

                if (!response.data) {
                    continue;
                }

                const { data } = response;

                kbs.push({
                    id: data?.id.toString(),
                    publishDate: data.fields.publishedDate.value,
                    title: data.fields['title_nested.en'].value,
                    content: data.fields['html_other_nested.en'].value,
                    description: data.fields['description_nested.en'].value,
                    category: data.fields['category_nested.en'].value
                });
            }
            await nango.batchSave(kbs, 'HubspotKnowledgeBase');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
