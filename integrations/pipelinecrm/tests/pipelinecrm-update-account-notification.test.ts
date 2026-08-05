import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-account-notification.js';

describe('pipelinecrm update-account-notification tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-account-notification',
        Model: 'ActionOutput_pipelinecrm_updateaccountnotification'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
