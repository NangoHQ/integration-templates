import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-application-groups.js';

describe('okta list-application-groups tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-application-groups',
        Model: 'ActionOutput_okta_cc_listapplicationgroups'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
