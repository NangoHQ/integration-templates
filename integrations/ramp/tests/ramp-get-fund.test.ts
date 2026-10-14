import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-fund.js';

describe('ramp get-fund tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-fund',
        Model: 'ActionOutput_ramp_getfund'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
