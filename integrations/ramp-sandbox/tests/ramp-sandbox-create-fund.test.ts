import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-fund.js';

describe('ramp-sandbox create-fund tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-fund',
        Model: 'ActionOutput_ramp_sandbox_createfund'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
