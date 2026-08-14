import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-user-invitation.js';

describe('datadog get-user-invitation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-user-invitation',
        Model: 'ActionOutput_datadog_getuserinvitation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
