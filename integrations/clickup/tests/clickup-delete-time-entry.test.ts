import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-time-entry.js';

describe('clickup delete-time-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-time-entry',
        Model: 'ActionOutput_clickup_deletetimeentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
