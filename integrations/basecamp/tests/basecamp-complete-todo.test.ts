import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/complete-todo.js';

describe('basecamp complete-todo tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'complete-todo',
        Model: 'ActionOutput_basecamp_completetodo'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
