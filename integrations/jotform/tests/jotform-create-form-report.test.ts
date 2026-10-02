import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-form-report.js';

describe('jotform create-form-report tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-form-report',
        Model: 'ActionOutput_jotform_createformreport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
