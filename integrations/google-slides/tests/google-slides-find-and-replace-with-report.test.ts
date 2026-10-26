import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/find-and-replace-with-report.js';

describe('google-slides find-and-replace-with-report tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'find-and-replace-with-report',
        Model: 'ActionOutput_google_slides_findandreplacewithreport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
