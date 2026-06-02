import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-company-file.js';

describe('bamboohr delete-company-file tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-company-file',
        Model: 'ActionOutput_bamboohr_deletecompanyfile'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
