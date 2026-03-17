import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-conditional-format-rule.js';

describe('google-sheet update-conditional-format-rule tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-conditional-format-rule',
        Model: 'ActionOutput_google_sheet_updateconditionalformatrule'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
