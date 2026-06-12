import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-call-outcomes.js';

describe('gong-oauth list-call-outcomes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-call-outcomes',
        Model: 'ActionOutput_gong_oauth_listcalloutcomes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
