import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-data-for-email.js';

describe('gong-oauth delete-data-for-email tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-data-for-email',
        Model: 'ActionOutput_gong_oauth_deletedataforemail'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
