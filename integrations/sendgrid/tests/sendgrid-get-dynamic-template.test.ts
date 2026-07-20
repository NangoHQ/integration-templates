import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-dynamic-template.js';

describe('sendgrid get-dynamic-template tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-dynamic-template',
        Model: 'ActionOutput_sendgrid_getdynamictemplate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
