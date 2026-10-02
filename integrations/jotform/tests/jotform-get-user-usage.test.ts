import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-user-usage.js';

describe('jotform get-user-usage tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-user-usage',
        Model: 'ActionOutput_jotform_getuserusage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
