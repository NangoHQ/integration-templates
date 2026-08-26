import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-rule-priorities.js';

describe('gorgias update-rule-priorities tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-rule-priorities',
        Model: 'ActionOutput_gorgias_updaterulepriorities'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
