import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/refire-submission-webhooks.js';

describe('basin refire-submission-webhooks tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'refire-submission-webhooks',
        Model: 'ActionOutput_basin_refiresubmissionwebhooks'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
