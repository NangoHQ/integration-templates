import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-interview.js';

describe('lever-basic update-interview tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-interview',
        Model: 'ActionOutput_lever_basic_updateinterview'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
