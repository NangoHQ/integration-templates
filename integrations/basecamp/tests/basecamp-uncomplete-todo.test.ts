import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/uncomplete-todo.js';

describe('basecamp uncomplete-todo tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'uncomplete-todo',
        Model: 'ActionOutput_basecamp_uncompletetodo'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
