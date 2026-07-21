import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/publish-template.js';

describe('mandrill publish-template tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'publish-template',
        Model: 'ActionOutput_mandrill_publishtemplate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
