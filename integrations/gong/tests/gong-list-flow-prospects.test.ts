import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-flow-prospects.js';

describe('gong-oauth list-flow-prospects tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-flow-prospects',
        Model: 'ActionOutput_gong_oauth_listflowprospects'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
