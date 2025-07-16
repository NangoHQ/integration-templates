import { createSync } from "nango";
import { LeverStage } from "../models.js";
import { z } from "zod";

const LIMIT = 100;

const sync = createSync({
    description: "Fetches a list of all pipeline stages in Lever",
    version: "1.0.1",
    frequency: "every 6 hours",
    autoStart: true,
    syncType: "full",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/stages",
        group: "Stages"
    }],

    scopes: ["stages:read:admin"],

    models: {
        LeverStage: LeverStage
    },

    metadata: z.object({}),

    exec: async nango => {
        let totalRecords = 0;

        const endpoint = '/v1/stages';
        const config = {
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'next',
                cursor_name_in_request: 'offset',
                limit_name_in_request: 'limit',
                response_path: 'data',
                limit: LIMIT
            }
        };
        for await (const stage of nango.paginate({ ...config, endpoint })) {
            const mappedStage: LeverStage[] = stage.map(mapStage) || [];

            const batchSize: number = mappedStage.length;
            totalRecords += batchSize;
            await nango.log(`Saving batch of ${batchSize} stage(s) (total stage(s): ${totalRecords})`);
            await nango.batchSave(mappedStage, 'LeverStage');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

function mapStage(stage: any): LeverStage {
    return {
        id: stage.id,
        text: stage.text
    };
}
