import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-prospects-from-flow.js';

describe('gong-oauth remove-prospects-from-flow tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-prospects-from-flow',
        Model: 'ActionOutput_gong_oauth_removeprospectsfromflow'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
