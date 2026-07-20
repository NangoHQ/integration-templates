import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-custom-field.js';

describe('highlevel get-custom-field tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-custom-field',
        Model: 'ActionOutput_highlevel_getcustomfield'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
