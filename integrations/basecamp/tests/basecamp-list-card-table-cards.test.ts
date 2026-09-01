import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-card-table-cards.js';

describe('basecamp list-card-table-cards tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-card-table-cards',
        Model: 'ActionOutput_basecamp_listcardtablecards'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('should omit email_address when the provider returns it as null for a card creator/assignee', async () => {
        const nullEmailMock = new global.vitest.NangoActionMock({
            dirname: __dirname,
            name: 'list-card-table-cards-null-email',
            Model: 'ActionOutput_basecamp_listcardtablecards'
        });

        const input = await nullEmailMock.getInput();
        const response = await createAction.exec(nullEmailMock, input);
        const output = await nullEmailMock.getOutput();

        expect(response).toEqual(output);
    });
});
