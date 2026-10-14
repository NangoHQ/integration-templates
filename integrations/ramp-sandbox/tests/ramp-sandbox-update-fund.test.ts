import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-fund.js';

describe('ramp-sandbox update-fund tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-fund',
        Model: 'ActionOutput_ramp_sandbox_updatefund'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
