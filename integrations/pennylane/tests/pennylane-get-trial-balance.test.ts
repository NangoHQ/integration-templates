import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-trial-balance.js';

describe('pennylane get-trial-balance tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-trial-balance',
        Model: 'ActionOutput_pennylane_gettrialbalance'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
