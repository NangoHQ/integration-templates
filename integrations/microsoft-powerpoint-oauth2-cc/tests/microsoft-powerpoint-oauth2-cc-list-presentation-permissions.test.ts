import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-presentation-permissions.js';

describe('microsoft-powerpoint-oauth2-cc list-presentation-permissions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-presentation-permissions',
        Model: 'ActionOutput_microsoft_powerpoint_oauth2_cc_listpresentationpermissions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
