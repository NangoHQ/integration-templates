import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/batch-update-group-profiles.js';

describe('mixpanel batch-update-group-profiles tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'batch-update-group-profiles',
        Model: 'ActionOutput_mixpanel_batchupdategroupprofiles'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
