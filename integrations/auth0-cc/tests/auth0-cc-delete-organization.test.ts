import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-organization.js';

describe('auth0-cc delete-organization tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-organization',
        Model: 'ActionOutput_auth0_cc_deleteorganization'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
