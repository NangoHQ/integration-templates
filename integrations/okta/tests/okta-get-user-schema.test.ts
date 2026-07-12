import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-user-schema.js';

describe('okta get-user-schema tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-user-schema',
        Model: 'ActionOutput_okta_cc_getuserschema'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
