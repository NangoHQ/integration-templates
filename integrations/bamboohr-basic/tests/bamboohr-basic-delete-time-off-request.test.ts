import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-time-off-request.js';

describe('bamboohr delete-time-off-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-time-off-request',
        Model: 'ActionOutput_bamboohr_deletetimeoffrequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
