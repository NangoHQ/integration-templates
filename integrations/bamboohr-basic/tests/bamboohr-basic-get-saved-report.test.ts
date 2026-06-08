import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-saved-report.js';

describe('bamboohr get-saved-report tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-saved-report',
        Model: 'ActionOutput_bamboohr_getsavedreport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
