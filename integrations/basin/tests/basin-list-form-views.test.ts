import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-form-views.js';

describe('basin list-form-views tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-form-views',
        Model: 'ActionOutput_basin_listformviews'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
