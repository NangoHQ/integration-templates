import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/request-profile-deletion.js';

describe('klaviyo request-profile-deletion tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'request-profile-deletion',
        Model: 'ActionOutput_klaviyo_requestprofiledeletion'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
