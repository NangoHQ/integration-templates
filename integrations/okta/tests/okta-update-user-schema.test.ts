import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-user-schema.js';

describe('okta update-user-schema tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-user-schema',
        Model: 'ActionOutput_okta_cc_updateuserschema'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
