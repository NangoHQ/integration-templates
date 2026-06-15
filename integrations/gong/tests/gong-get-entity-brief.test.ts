import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-entity-brief.js';

describe('gong-oauth get-entity-brief tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-entity-brief',
        Model: 'ActionOutput_gong_oauth_getentitybrief'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
