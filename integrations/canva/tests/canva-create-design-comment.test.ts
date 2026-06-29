import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-design-comment.js';

describe('canva create-design-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-design-comment',
        Model: 'ActionOutput_canva_createdesigncomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
