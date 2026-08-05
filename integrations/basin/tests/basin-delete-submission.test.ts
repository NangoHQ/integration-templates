import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-submission.js';

describe('basin delete-submission tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-submission',
        Model: 'ActionOutput_basin_deletesubmission'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
