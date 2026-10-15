import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-mural-widget.js';

describe('mural delete-mural-widget tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-mural-widget',
        Model: 'ActionOutput_mural_deletemuralwidget'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
