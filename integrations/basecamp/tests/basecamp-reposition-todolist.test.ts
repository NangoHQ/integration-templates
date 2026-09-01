import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/reposition-todolist.js';

describe('basecamp reposition-todolist tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'reposition-todolist',
        Model: 'ActionOutput_basecamp_repositiontodolist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
