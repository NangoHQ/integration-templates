import { createSync } from "nango";
import type { ProxyConfiguration } from "nango";
import { WildixPbxColleague } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches a list of users from PBX",
    version: "1.0.0",
    frequency: "every 1 hour",
    autoStart: true,
    syncType: "full",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/wildix-pbx/colleagues"
    }],

    models: {
        WildixPbxColleague: WildixPbxColleague
    },

    metadata: z.object({}),

    exec: async nango => {
        const MAX_IN_PAGE: number = 10;

        let page: number = 1;
        let allPages: number = 1;
        let start: number = 0;

        const connection = await nango.getConnection();

        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
        while (true) {
            const payload: ProxyConfiguration = {
                baseUrlOverride: `https://${connection.connection_config['subdomain']}.wildixin.com`,
                // https://docs.wildix.com/wms/index.html#tag/Colleagues
                endpoint: '/api/v1/Colleagues/',
                params: {
                    start,
                    count: MAX_IN_PAGE
                },
                retries: 10
            };

            const { data } = await nango.get(payload);
            const { records, total } = data.result;

            allPages = Math.ceil(total / MAX_IN_PAGE);

            const mappedUsers: WildixPbxColleague[] = records.map((colleague: WildixPbxColleague) => ({
                id: colleague.id,
                name: colleague.name,
                extension: colleague.extension,
                email: colleague.email,
                mobilePhone: colleague.mobilePhone,
                licenseType: colleague.licenseType,
                language: colleague.language
            }));

            if (mappedUsers.length > 0) {
                await nango.batchSave(mappedUsers, 'WildixPbxColleague');
                await nango.log(`Total colleagues ${total}. Page ${page}/${allPages}.`);
            }

            if (records.length === MAX_IN_PAGE) {
                page += 1;
                start = (page - 1) * MAX_IN_PAGE;
            } else {
                break;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
