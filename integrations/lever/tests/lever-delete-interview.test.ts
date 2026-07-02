import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-interview.js';

describe('lever-basic delete-interview tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-interview',
        Model: 'ActionOutput_lever_basic_deleteinterview'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
