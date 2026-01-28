
import { test, expect } from '@playwright/test';

// Helper to get room code
async function createGame(browser) {
    const tvContext = await browser.newContext();
    const tvPage = await tvContext.newPage();
    await tvPage.goto('/');

    await tvPage.click('text=Create New Game');
    // Wait for room code
    const roomCodeElement = tvPage.locator('.text-4xl.tracking-widest.font-mono');
    await expect(roomCodeElement).toBeVisible();
    const roomCode = await roomCodeElement.innerText();
    return { tvPage, roomCode, tvContext };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function joinSpymaster(browser: any, roomCode: string, team: string) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`/join/${roomCode}`);
    await page.getByRole('button', { name: `${team} Spymaster` }).click();
    return { page, context };
}

test.describe('Gameplay Happy Paths', () => {
    test('Winning Game Flow (Dynamic Start)', async ({ browser }) => {
        const { tvPage, roomCode } = await createGame(browser);
        const red = await joinSpymaster(browser, roomCode, 'Red');
        const blue = await joinSpymaster(browser, roomCode, 'Blue');

        // Start Game
        // Either can start. Let's use Red.
        await red.page.click('text=Start Game');
        await expect(tvPage.locator('text=Spymaster is thinking...')).toBeVisible({ timeout: 10000 });

        // Determine Start Team from TV
        // Use TestID for reliability
        const turnText = await tvPage.getByTestId('turn-badge').innerText();
        const isRedTurn = turnText.toLowerCase().includes('red');
        console.log(`Starting Team: ${isRedTurn ? 'Red' : 'Blue'}`);

        const activeSpymaster = isRedTurn ? red : blue;
        const passiveSpymaster = isRedTurn ? blue : red;
        const activeTeamColor = isRedTurn ? 'red' : 'blue';

        // 1. Give Clue
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'WIN');
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Verify TV shows clue
        // Verify TV shows clue (in history or main display)
        await expect(tvPage.getByText('WIN').first()).toBeVisible();

        // Wait for state to propagate to passive spymaster
        await passiveSpymaster.page.waitForTimeout(1000);

        // 2. Opposing Spymaster (Guesser) Selects Card
        // Opponent needs to tap a card of the ACTIVE team (to point verification).
        // The active team wants their own cards revealed.
        // In this app, the ACTIVE team's operatives guess.
        // The OPPOSING spymaster taps the card.
        // So 'passiveSpymaster' should see "Tap {Active}'s Guess".

        const tapTextRegex = new RegExp(`Tap ${activeTeamColor.toUpperCase()}'s Guess`, 'i');
        await expect(passiveSpymaster.page.getByRole('heading', { name: tapTextRegex })).toBeVisible({ timeout: 15000 });

        // Active Spymaster sees ring-red-500.
        await activeSpymaster.page.waitForSelector('.grid'); // Wait for grid

        // Debug: Dump body if rings not found
        const count = await activeSpymaster.page.locator(`.ring-${activeTeamColor}-500`).count();
        console.log(`Rings found: ${count}`);
        if (count === 0) {
            console.log("Body Dump Active:");
            console.log(await activeSpymaster.page.innerText('body'));
        }

        // Find first word.
        const targetCardLocator = activeSpymaster.page.locator(`.ring-${activeTeamColor}-500`).first();
        const targetWord = await targetCardLocator.innerText();
        console.log(`Target Winning Word: ${targetWord}`);

        // Now Passive Spymaster clicks that word.
        // On Passive page, find button with that text.
        await passiveSpymaster.page.getByRole('button', { name: targetWord }).click();

        // Confirm
        const confirmButton = passiveSpymaster.page.getByRole('button', { name: 'Confirm Selection' });
        await expect(confirmButton).toBeVisible();
        await confirmButton.click();

        // Verify Score Increase
        // Check Passive Page first (immediate feedback)
        await expect(passiveSpymaster.page.locator(`button:has-text("${targetWord}")`)).toHaveClass(/bg-(red|blue)-600/);
        // Then TV
        await expect(tvPage.locator(`button:has-text("${targetWord}")`)).toHaveClass(/bg-(red|blue)-600/);

        // Teardown
        await red.context.close();
        await blue.context.close();
        await tvPage.close();
    });
});
