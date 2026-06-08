import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-applicant.js';

describe('bamboohr get-applicant tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-applicant',
        Model: 'ActionOutput_bamboohr_getapplicant'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
