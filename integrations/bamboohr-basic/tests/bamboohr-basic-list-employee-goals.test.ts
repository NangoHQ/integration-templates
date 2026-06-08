import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-employee-goals.js';

describe('bamboohr list-employee-goals tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-employee-goals',
        Model: 'ActionOutput_bamboohr_listemployeegoals'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
