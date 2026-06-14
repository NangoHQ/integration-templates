import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/ask-entity.js';

describe('gong-oauth ask-entity tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'ask-entity',
        Model: 'ActionOutput_gong_oauth_askentity'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
