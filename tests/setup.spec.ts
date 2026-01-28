
import { test, expect } from '@playwright/test';

test.describe('Game Setup & Roles', () => {

    test('TV can create a room and Spymasters can join', async ({ browser }) => {
        // 1. TV Context
        const tvContext = await browser.newContext();
        const tvPage = await tvContext.newPage();
        await tvPage.goto('/');

        // Click Host Game -> Create New Game
        await tvPage.click('text=Create New Game');

        // Expect to be redirected to TV view
        await expect(tvPage).toHaveURL(/\/tv\/[A-Z0-9]{6}/);

        // Expect to see a room code (TVView uses CardTitle which is h3, but class is consistent)
        const roomCodeElement = tvPage.locator('.text-4xl.tracking-widest.font-mono');
        await expect(roomCodeElement).toBeVisible();
        const roomCode = await roomCodeElement.innerText();
        expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

        // 2. Red Spymaster Context
        const redContext = await browser.newContext();
        const redPage = await redContext.newPage();

        redPage.on('console', msg => console.log(`[Browser] ${msg.text()}`));
        // Select Red Spymaster
        console.log('Navigating to join...');
        await redPage.goto(`/join/${roomCode}`);
        console.log('Waiting for load...');
        // Debug: Check if we are stuck loading
        const loading = await redPage.getByText('Joining game...').isVisible();
        if (loading) console.log('Stuck in Joining game...');

        // Debug: Dump body text
        const body = await redPage.innerText('body');
        console.log('Page Body:', body);

        await redPage.getByRole('button', { name: 'Red Spymaster' }).click();
        await expect(redPage.locator('text=RED Spymaster')).toBeVisible();

        // 3. Blue Spymaster Context
        const blueContext = await browser.newContext();
        const bluePage = await blueContext.newPage();
        await bluePage.goto(`/join/${roomCode}`);

        // Select Blue Spymaster
        await bluePage.getByRole('button', { name: 'Blue Spymaster' }).click();
        await expect(bluePage.locator('text=BLUE Spymaster')).toBeVisible();

        // 4. Verify Role Conflict (Try to join as Red again)
        const extraContext = await browser.newContext();
        const extraPage = await extraContext.newPage();
        await extraPage.goto(`/join/${roomCode}`);

        // In our UI, the button should be disabled and show "Taken"
        const redButton = extraPage.getByRole('button', { name: 'Red Spymaster' });
        await expect(redButton).toBeDisabled();
        await expect(redButton).toContainText('Taken');

        await tvContext.close();
        await redContext.close();
        await blueContext.close();
        await extraContext.close();
    });


});
