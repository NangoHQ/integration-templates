import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/hold-bill.js';

describe('ramp-sandbox hold-bill tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'hold-bill',
        Model: 'ActionOutput_ramp_sandbox_holdbill'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
