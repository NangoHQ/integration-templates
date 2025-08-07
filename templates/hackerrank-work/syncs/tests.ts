import { createSync } from "nango";
import type { ProxyConfiguration } from "nango";
import { HackerRankWorkTest } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches a list of tests from hackerrank work",
    version: "2.0.0",
    frequency: "every 6 hours",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/tests",
        group: "Tests"
    }],

    models: {
        HackerRankWorkTest: HackerRankWorkTest
    },

    metadata: z.object({}),

    exec: async nango => {
        let totalRecords = 0;

        const config: ProxyConfiguration = {
            // https://www.hackerrank.com/work/apidocs#!/Tests/get_x_api_v3_tests_limit_limit_offset_offset
            endpoint: '/x/api/v3/tests',
            paginate: {
                type: 'link',
                limit_name_in_request: 'limit',
                link_path_in_response_body: 'next',
                response_path: 'data',
                limit: 100
            }
        };

        const lastSyncDate = nango.lastSyncDate;
        for await (const test of nango.paginate(config)) {
            const testsToSave = [];
            for (const item of test) {
                if (lastSyncDate !== undefined && new Date(item.created_at) < lastSyncDate) {
                    continue; // Skip tests created before lastSyncDate
                }
                const mappedTest: HackerRankWorkTest = mapTest(item);

                totalRecords++;
                testsToSave.push(mappedTest);
            }

            if (testsToSave.length > 0) {
                await nango.batchSave(testsToSave, 'HackerRankWorkTest');
                await nango.log(`Saving batch of ${testsToSave.length} test(s) (total test(s): ${totalRecords})`);
            }
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

function mapTest(test: any): HackerRankWorkTest {
    return {
        id: test.id,
        unique_id: test.unique_id,
        name: test.name,
        duration: test.duration,
        owner: test.owner,
        instructions: test.instructions,
        created_at: test.created_at,
        state: test.state,
        locked: test.locked,
        test_type: test.test_type,
        starred: test.starred,
        start_time: test.start_time,
        end_time: test.end_time,
        draft: test.draft,
        questions: test.questions,
        sections: test.sections,
        tags: test.tags,
        permission: test.permission
    };
}
