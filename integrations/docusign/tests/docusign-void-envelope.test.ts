import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/void-envelope.js';

describe('docusign void-envelope tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'void-envelope',
        Model: 'ActionOutput_docusign_voidenvelope'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
