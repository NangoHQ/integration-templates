import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-employee-table-row.js';

describe('bamboohr get-employee-table-row tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-employee-table-row',
        Model: 'ActionOutput_bamboohr_getemployeetablerow'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
