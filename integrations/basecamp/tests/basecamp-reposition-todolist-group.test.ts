import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/reposition-todolist-group.js';

describe('basecamp reposition-todolist-group tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'reposition-todolist-group',
        Model: 'ActionOutput_basecamp_repositiontodolistgroup'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
