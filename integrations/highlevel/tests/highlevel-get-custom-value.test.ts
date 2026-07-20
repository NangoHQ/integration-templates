import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-custom-value.js';

describe('highlevel get-custom-value tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-custom-value',
        Model: 'ActionOutput_highlevel_getcustomvalue'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
