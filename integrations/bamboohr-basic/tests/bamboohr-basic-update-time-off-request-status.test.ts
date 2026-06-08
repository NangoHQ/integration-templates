import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-time-off-request-status.js';

describe('bamboohr update-time-off-request-status tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-time-off-request-status',
        Model: 'ActionOutput_bamboohr_updatetimeoffrequeststatus'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
