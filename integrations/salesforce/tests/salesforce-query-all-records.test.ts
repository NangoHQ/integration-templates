import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/query-all-records.js';

describe('salesforce query-all-records tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'query-all-records',
        Model: 'ActionOutput_salesforce_queryallrecords'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
