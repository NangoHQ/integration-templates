import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-employee-orgchart.js';

describe('workable get-employee-orgchart tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-employee-orgchart',
        Model: 'ActionOutput_workable_getemployeeorgchart'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
