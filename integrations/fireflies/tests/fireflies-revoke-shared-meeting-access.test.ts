import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/revoke-shared-meeting-access.js';

describe('fireflies revoke-shared-meeting-access tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'revoke-shared-meeting-access',
        Model: 'ActionOutput_fireflies_revokesharedmeetingaccess'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
