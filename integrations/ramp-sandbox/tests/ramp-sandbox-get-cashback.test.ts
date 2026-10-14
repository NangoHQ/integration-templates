import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-cashback.js';

describe('ramp-sandbox get-cashback tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-cashback',
        Model: 'ActionOutput_ramp_sandbox_getcashback'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
