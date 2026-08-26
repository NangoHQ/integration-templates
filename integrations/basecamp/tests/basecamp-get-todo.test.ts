import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-todo.js';

describe('basecamp get-todo tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-todo',
        Model: 'ActionOutput_basecamp_gettodo'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
