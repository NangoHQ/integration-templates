import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/retrieve-query-more.js';

describe('salesforce retrieve-query-more tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'retrieve-query-more',
        Model: 'ActionOutput_salesforce_retrievequerymore'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
