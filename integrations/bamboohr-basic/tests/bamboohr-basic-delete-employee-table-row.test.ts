import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-employee-table-row.js';

describe('bamboohr delete-employee-table-row tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-employee-table-row',
        Model: 'ActionOutput_bamboohr_deleteemployeetablerow'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
