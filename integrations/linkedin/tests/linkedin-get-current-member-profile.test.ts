import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-current-member-profile.js';

describe('linkedin get-current-member-profile tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-current-member-profile',
        Model: 'ActionOutput_linkedin_getcurrentmemberprofile'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
