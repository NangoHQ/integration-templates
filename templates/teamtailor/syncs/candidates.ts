import { createSync } from "nango";
import type { ProxyConfiguration } from "nango";
import { TeamtailorCandidate } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches a list of all candidates from your teamtailor account.",
    version: "1.0.0",
    frequency: "every 6 hours",
    autoStart: true,
    syncType: "full",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/teamtailor/candidates"
    }],

    scopes: ["Admin"],

    models: {
        TeamtailorCandidate: TeamtailorCandidate
    },

    metadata: z.object({}),

    exec: async nango => {
        let totalRecords = 0;

        const config: ProxyConfiguration = {
            // https://docs.teamtailor.com/#759f6a0c-5b05-4d9c-b1c8-af80c5d9b620
            endpoint: '/v1/candidates',
            paginate: {
                type: 'link',
                link_path_in_response_body: 'links.next',
                limit_name_in_request: 'page[size]',
                response_path: 'data',
                limit: 30
            }
        };
        for await (const candidate of nango.paginate(config)) {
            const mappedCandidate: TeamtailorCandidate[] = candidate.map(mapCandidate) || [];

            const batchSize: number = mappedCandidate.length;
            totalRecords += batchSize;
            await nango.log(`Saving batch of ${batchSize} candidate(s) (total candidate(s): ${totalRecords})`);
            await nango.batchSave(mappedCandidate, 'TeamtailorCandidate');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

function mapCandidate(candidate: any): TeamtailorCandidate {
    return {
        id: candidate.id,
        type: candidate.type,
        links: candidate.links,
        attributes: candidate.attributes,
        relationships: candidate.relationships
    };
}
