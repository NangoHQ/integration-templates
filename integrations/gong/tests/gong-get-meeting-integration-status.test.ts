import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-meeting-integration-status.js';

describe('gong-oauth get-meeting-integration-status tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-meeting-integration-status',
        Model: 'ActionOutput_gong_oauth_getmeetingintegrationstatus'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
