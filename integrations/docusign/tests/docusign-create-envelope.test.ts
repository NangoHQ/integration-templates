import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-envelope.js';

describe('docusign create-envelope tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-envelope',
        Model: 'ActionOutput_docusign_createenvelope'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
