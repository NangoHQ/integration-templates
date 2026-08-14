import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-submission.js';

describe('basin get-submission tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-submission',
        Model: 'ActionOutput_basin_getsubmission'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
