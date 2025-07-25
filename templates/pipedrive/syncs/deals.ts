import { createSync } from "nango";
import type { ProxyConfiguration } from "nango";
import { PipeDriveDeal } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches a list of deals from pipedrive",
    version: "1.0.0",
    frequency: "every hour",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/pipedrive/deals"
    }],

    scopes: ["deals:read"],

    models: {
        PipeDriveDeal: PipeDriveDeal
    },

    metadata: z.object({}),

    exec: async nango => {
        let totalRecords = 0;

        const config: ProxyConfiguration = {
            // https://developers.pipedrive.com/docs/api/v1/Deals#getDealsCollection
            endpoint: '/v1/deals/collection',
            ...(nango.lastSyncDate ? { params: { since: nango.lastSyncDate?.toISOString() } } : {}),
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'additional_data.next_cursor',
                cursor_name_in_request: 'cursor',
                limit_name_in_request: 'limit',
                response_path: 'data',
                limit: 100
            }
        };
        for await (const deal of nango.paginate(config)) {
            const mappedDeal: PipeDriveDeal[] = deal.map(mapDeal) || [];
            // Save Deal
            const batchSize: number = mappedDeal.length;
            totalRecords += batchSize;
            await nango.log(`Saving batch of ${batchSize} deals (total deals: ${totalRecords})`);
            await nango.batchSave(mappedDeal, 'PipeDriveDeal');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

function mapDeal(deal: any): PipeDriveDeal {
    return {
        id: deal.id,
        creator_user_id: deal.creator_user_id,
        user_id: deal.user_id,
        person_id: deal.person_id,
        org_id: deal.org_id,
        stage_id: deal.stage_id,
        title: deal.title,
        value: deal.value,
        currency: deal.currency,
        add_time: deal.add_time,
        update_time: deal.update_time,
        status: deal.status,
        probability: deal.probability,
        lost_reason: deal.lost_reason,
        visible_to: deal.visible_to,
        close_time: deal.close_time,
        pipeline_id: deal.pipeline_id,
        won_time: deal.won_time,
        lost_time: deal.lost_time,
        expected_close_date: deal.expected_close_date,
        label: deal.label
    };
}
