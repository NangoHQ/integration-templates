import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-time-off-balance.js';

describe('bamboohr get-time-off-balance tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-time-off-balance',
        Model: 'ActionOutput_bamboohr_gettimeoffbalance'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
