import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-targeting-template.js';

describe('pinterest create-targeting-template tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-targeting-template',
        Model: 'ActionOutput_pinterest_createtargetingtemplate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
