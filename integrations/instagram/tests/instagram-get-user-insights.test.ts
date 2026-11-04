import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-user-insights.js';

describe('instagram get-user-insights tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-user-insights',
        Model: 'ActionOutput_instagram_getuserinsights'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
