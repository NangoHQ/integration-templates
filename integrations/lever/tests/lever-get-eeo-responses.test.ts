import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-eeo-responses.js';

describe('lever-basic get-eeo-responses tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-eeo-responses',
        Model: 'ActionOutput_lever_basic_geteeoresponses'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
