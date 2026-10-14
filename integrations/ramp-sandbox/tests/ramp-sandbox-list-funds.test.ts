import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-funds.js';

describe('ramp-sandbox list-funds tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-funds',
        Model: 'ActionOutput_ramp_sandbox_listfunds'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
