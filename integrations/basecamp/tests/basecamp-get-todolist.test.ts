import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-todolist.js';

describe('basecamp get-todolist tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-todolist',
        Model: 'ActionOutput_basecamp_gettodolist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
