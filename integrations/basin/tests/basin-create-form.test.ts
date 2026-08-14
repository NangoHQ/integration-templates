import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-form.js';

describe('basin create-form tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-form',
        Model: 'ActionOutput_basin_createform'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
