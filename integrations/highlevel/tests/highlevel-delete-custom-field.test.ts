import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-custom-field.js';

describe('highlevel delete-custom-field tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-custom-field',
        Model: 'ActionOutput_highlevel_deletecustomfield'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
