import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-report.js';

describe('jotform get-report tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-report',
        Model: 'ActionOutput_jotform_getreport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
