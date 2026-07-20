import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-global-suppressions.js';

describe('sendgrid add-global-suppressions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-global-suppressions',
        Model: 'ActionOutput_sendgrid_addglobalsuppressions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
