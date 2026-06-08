import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-employee-table-rows.js';

describe('bamboohr list-employee-table-rows tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-employee-table-rows',
        Model: 'ActionOutput_bamboohr_listemployeetablerows'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
