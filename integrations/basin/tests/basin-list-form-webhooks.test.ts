import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-form-webhooks.js';

describe('basin list-form-webhooks tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-form-webhooks',
        Model: 'ActionOutput_basin_listformwebhooks'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
