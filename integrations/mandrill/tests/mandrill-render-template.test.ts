import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/render-template.js';

describe('mandrill render-template tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'render-template',
        Model: 'ActionOutput_mandrill_rendertemplate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
