import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-template.js';

describe('mandrill delete-template tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-template',
        Model: 'ActionOutput_mandrill_deletetemplate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
