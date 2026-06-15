import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-data-for-phone.js';

describe('gong-oauth delete-data-for-phone tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-data-for-phone',
        Model: 'ActionOutput_gong_oauth_deletedataforphone'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
