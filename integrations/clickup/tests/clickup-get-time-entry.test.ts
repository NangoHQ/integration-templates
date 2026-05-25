import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-time-entry.js';

describe('clickup get-time-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-time-entry',
        Model: 'ActionOutput_clickup_gettimeentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
