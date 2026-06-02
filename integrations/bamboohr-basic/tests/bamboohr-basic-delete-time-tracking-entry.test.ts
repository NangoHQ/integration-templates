import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-time-tracking-entry.js';

describe('bamboohr delete-time-tracking-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-time-tracking-entry',
        Model: 'ActionOutput_bamboohr_deletetimetrackingentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
