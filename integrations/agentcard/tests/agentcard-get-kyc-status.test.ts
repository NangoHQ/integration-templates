import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-kyc-status.js';

describe('agentcard get-kyc-status tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-kyc-status',
        Model: 'ActionOutput_agentcard_getkycstatus'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
