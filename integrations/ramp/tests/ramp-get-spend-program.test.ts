import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-spend-program.js';

describe('ramp get-spend-program tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-spend-program',
        Model: 'ActionOutput_ramp_getspendprogram'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
