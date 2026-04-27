import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-cycle.js';

describe('linear update-cycle tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-cycle',
        Model: 'ActionOutput_linear_updatecycle'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
