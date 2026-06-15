import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-integration-settings.js';

describe('gong-oauth update-integration-settings tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-integration-settings',
        Model: 'ActionOutput_gong_oauth_updateintegrationsettings'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
