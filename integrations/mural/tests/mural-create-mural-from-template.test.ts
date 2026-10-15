import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-mural-from-template.js';

describe('mural create-mural-from-template tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-mural-from-template',
        Model: 'ActionOutput_mural_createmuralfromtemplate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
