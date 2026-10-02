import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-submission-with-labels.js';

describe('jotform get-submission-with-labels tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-submission-with-labels',
        Model: 'ActionOutput_jotform_getsubmissionwithlabels'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
