import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-scorecards.js';

describe('gong-oauth list-scorecards tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-scorecards',
        Model: 'ActionOutput_gong_oauth_listscorecards'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
