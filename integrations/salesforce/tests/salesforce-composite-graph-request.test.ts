import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/composite-graph-request.js';

describe('salesforce composite-graph-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'composite-graph-request',
        Model: 'ActionOutput_salesforce_compositegraphrequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
