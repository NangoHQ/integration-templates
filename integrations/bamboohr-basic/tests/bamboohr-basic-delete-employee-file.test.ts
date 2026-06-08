import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-employee-file.js';

describe('bamboohr delete-employee-file tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-employee-file',
        Model: 'ActionOutput_bamboohr_deleteemployeefile'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
