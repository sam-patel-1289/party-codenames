import { test, expect } from '@playwright/test';
import { Browser } from 'playwright';

// Helper to get room code
async function createGame(browser: Browser) {
    const tvContext = await browser.newContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tvPage: any = await tvContext.newPage();
    await tvPage.goto('/');

    await tvPage.click('text=Create New Game');
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function setupPlayingGame(browser: any) {
    const { tvPage, roomCode, tvContext } = await createGame(browser);
    const red = await joinSpymaster(browser, roomCode, 'Red');
    const blue = await joinSpymaster(browser, roomCode, 'Blue');

    await red.page.click('text=Start Game');
    await expect(tvPage.locator('text=Spymaster is thinking...')).toBeVisible({ timeout: 10000 });

    // Determine who's active
    const turnText = await tvPage.getByTestId('turn-badge').innerText();
    const isRedTurn = turnText.toLowerCase().includes('red');
    const activeSpymaster = isRedTurn ? red : blue;
    const passiveSpymaster = isRedTurn ? blue : red;
    const activeTeam = isRedTurn ? 'red' : 'blue';

    return { tvPage, roomCode, red, blue, activeSpymaster, passiveSpymaster, activeTeam };
}

test.describe('TV Display - Clue Styling', () => {
    test('Clue word and number are colored with team color', async ({ browser }) => {
        const { tvPage, activeSpymaster, activeTeam } = await setupPlayingGame(browser);

        // Submit a clue
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'COLORTEST');
        await activeSpymaster.page.click('button:has-text("2")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Wait for clue to appear on TV
        await expect(tvPage.getByText('COLORTEST').first()).toBeVisible({ timeout: 5000 });

        // Verify the clue parent container has the team color class
        // The clue text is inside a div with text-red-500 or text-blue-500
        const clueLocator = activeTeam === 'red'
            ? tvPage.locator('.text-red-500:has-text("COLORTEST")')
            : tvPage.locator('.text-blue-500:has-text("COLORTEST")');

        await expect(clueLocator.first()).toBeVisible({ timeout: 2000 });
    });
});

test.describe('TV Display - Score Display', () => {
    test('Score shows remaining words not scored/target format', async ({ browser }) => {
        const { tvPage } = await setupPlayingGame(browser);

        // The score area should NOT show slash format like "0 / 8"
        // Instead it should show just the remaining count
        const scoreArea = tvPage.locator('.flex.justify-center.gap-8.mt-4');
        await expect(scoreArea).toBeVisible();

        // Should NOT find "/ 8" or "/ 9" pattern
        const hasSlashFormat = await tvPage.locator('text=/\\/ [0-9]/').count();
        expect(hasSlashFormat).toBe(0);

        // Should find single digit numbers for remaining words (8 or 9)
        await expect(tvPage.getByText('8').or(tvPage.getByText('9')).first()).toBeVisible();
    });
});

test.describe('Spymaster View - Key Card Persistence', () => {
    test('Spymaster always sees key card (answers) after giving clue', async ({ browser }) => {
        const { tvPage, activeSpymaster, passiveSpymaster, activeTeam } = await setupPlayingGame(browser);

        // Verify spymaster sees colored rings (key card) initially
        const activeTeamRings = activeSpymaster.page.locator(`.ring-${activeTeam}-500`);
        await expect(activeTeamRings.first()).toBeVisible({ timeout: 5000 });
        const initialRingCount = await activeTeamRings.count();
        expect(initialRingCount).toBeGreaterThan(0);

        // Submit clue
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'PERSIST');
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Wait for clue to appear
        await expect(tvPage.getByText('PERSIST').first()).toBeVisible({ timeout: 5000 });

        // Active spymaster should STILL see key card (colored rings)
        await expect(activeSpymaster.page.locator(`.ring-${activeTeam}-500`).first()).toBeVisible({ timeout: 3000 });
        const afterClueRingCount = await activeSpymaster.page.locator(`.ring-${activeTeam}-500`).count();
        expect(afterClueRingCount).toBeGreaterThan(0);
    });

    test('Spymaster sees key card during opponent selection phase', async ({ browser }) => {
        const { tvPage, activeSpymaster, passiveSpymaster, activeTeam } = await setupPlayingGame(browser);

        const passiveTeam = activeTeam === 'red' ? 'blue' : 'red';

        // Submit clue to trigger selection phase
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'KEYCARD');
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Wait for passive spymaster to enter selection mode
        await expect(passiveSpymaster.page.locator(`text=Tap ${activeTeam.toUpperCase()}'s Guess`)).toBeVisible({ timeout: 10000 });

        // Passive spymaster (the one selecting) should see their team's key card
        await expect(passiveSpymaster.page.locator(`.ring-${passiveTeam}-500`).first()).toBeVisible({ timeout: 3000 });
        const passiveRingCount = await passiveSpymaster.page.locator(`.ring-${passiveTeam}-500`).count();
        expect(passiveRingCount).toBeGreaterThan(0);
    });

    test('Key card visibility persists through entire game turn', async ({ browser }) => {
        const { tvPage, activeSpymaster, passiveSpymaster, activeTeam } = await setupPlayingGame(browser);

        const passiveTeam = activeTeam === 'red' ? 'blue' : 'red';

        // Submit clue
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'FULLTEST');
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Wait for selection phase
        await expect(passiveSpymaster.page.locator(`text=Tap ${activeTeam.toUpperCase()}'s Guess`)).toBeVisible({ timeout: 10000 });

        // Find a card to select
        const targetCard = activeSpymaster.page.locator(`.ring-${activeTeam}-500`).first();
        const targetWord = await targetCard.innerText();

        // Passive spymaster selects the card
        await passiveSpymaster.page.getByRole('button', { name: targetWord }).click();
        await passiveSpymaster.page.getByRole('button', { name: 'Confirm Selection' }).click();

        // Wait for reveal
        await expect(tvPage.locator(`button:has-text("${targetWord}")`)).toHaveClass(/bg-(red|blue)-600/, { timeout: 5000 });

        // Both spymasters should still see key card
        // Active spymaster
        const activeStillHasKey = await activeSpymaster.page.locator(`.ring-${activeTeam}-500, .ring-${passiveTeam}-500`).count();
        expect(activeStillHasKey).toBeGreaterThan(0);

        // Passive spymaster
        const passiveStillHasKey = await passiveSpymaster.page.locator(`.ring-${activeTeam}-500, .ring-${passiveTeam}-500`).count();
        expect(passiveStillHasKey).toBeGreaterThan(0);
    });
});
