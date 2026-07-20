import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-custom-field.js';

describe('highlevel update-custom-field tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-custom-field',
        Model: 'ActionOutput_highlevel_updatecustomfield'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
