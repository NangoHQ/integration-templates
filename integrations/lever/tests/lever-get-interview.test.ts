import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-interview.js';

describe('lever-basic get-interview tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-interview',
        Model: 'ActionOutput_lever_basic_getinterview'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
