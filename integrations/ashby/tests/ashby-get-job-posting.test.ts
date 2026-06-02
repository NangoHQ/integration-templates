import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-job-posting.js';

describe('ashby get-job-posting tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-job-posting',
        Model: 'ActionOutput_ashby_getjobposting'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
