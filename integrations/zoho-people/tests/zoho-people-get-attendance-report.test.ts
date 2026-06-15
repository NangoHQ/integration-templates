import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-attendance-report.js';

describe('zoho-people get-attendance-report tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-attendance-report',
        Model: 'ActionOutput_zoho_people_getattendancereport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
