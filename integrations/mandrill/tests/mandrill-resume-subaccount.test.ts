import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/resume-subaccount.js';

describe('mandrill resume-subaccount tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'resume-subaccount',
        Model: 'ActionOutput_mandrill_resumesubaccount'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
