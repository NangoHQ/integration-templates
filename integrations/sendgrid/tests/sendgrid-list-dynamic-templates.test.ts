import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-dynamic-templates.js';

describe('sendgrid list-dynamic-templates tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-dynamic-templates',
        Model: 'ActionOutput_sendgrid_listdynamictemplates'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
