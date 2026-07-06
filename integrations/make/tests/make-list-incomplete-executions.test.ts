import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-incomplete-executions.js';

describe('make list-incomplete-executions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-incomplete-executions',
        Model: 'ActionOutput_make_listincompleteexecutions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
