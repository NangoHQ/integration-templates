import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-report.js';

describe('jotform delete-report tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-report',
        Model: 'ActionOutput_jotform_deletereport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
