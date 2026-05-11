import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/query-records.js';

describe('salesforce query-records tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'query-records',
        Model: 'ActionOutput_salesforce_queryrecords'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
