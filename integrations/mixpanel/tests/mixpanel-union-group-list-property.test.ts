import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/union-group-list-property.js';

describe('mixpanel union-group-list-property tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'union-group-list-property',
        Model: 'ActionOutput_mixpanel_uniongrouplistproperty'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
