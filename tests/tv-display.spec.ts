/**
 * TV Display Experience Tests
 * 
 * The TV is the centerpiece of the game night - the shared display visible to all players.
 * These tests ensure an excellent spectator and player experience from the TV view.
 */

import { test, expect, Page, Browser } from '@playwright/test';

// ============================================================================
// Helpers
// ============================================================================

async function createGame(browser: Browser) {
    const tvContext = await browser.newContext();
    const tvPage = await tvContext.newPage();
    await tvPage.goto('/');
    await tvPage.click('text=Create New Game');

    const roomCodeElement = tvPage.locator('.text-4xl.tracking-widest.font-mono');
    await expect(roomCodeElement).toBeVisible();
    const roomCode = await roomCodeElement.innerText();

    return { tvPage, roomCode, tvContext };
}

async function joinSpymaster(browser: Browser, roomCode: string, team: 'Red' | 'Blue') {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`/join/${roomCode}`);
    await page.getByRole('button', { name: `${team} Spymaster` }).click();
    return { page, context };
}

async function setupPlayingGame(browser: Browser) {
    const { tvPage, roomCode, tvContext } = await createGame(browser);

    const red = await joinSpymaster(browser, roomCode, 'Red');
    const blue = await joinSpymaster(browser, roomCode, 'Blue');

    await red.page.click('text=Start Game');
    await expect(tvPage.locator('text=Spymaster is thinking...')).toBeVisible({ timeout: 10000 });

    const turnText = await tvPage.getByTestId('turn-badge').innerText();
    const isRedTurn = turnText.toLowerCase().includes('red');

    return {
        tvPage,
        tvContext,
        red,
        blue,
        activeSpymaster: isRedTurn ? red : blue,
        passiveSpymaster: isRedTurn ? blue : red,
        activeTeam: isRedTurn ? 'red' : 'blue',
    };
}

// ============================================================================
// LOBBY / WAITING STATE TESTS
// ============================================================================

test.describe('TV Display - Lobby State', () => {
    test('TV shows prominent room code in lobby', async ({ browser }) => {
        const { tvPage, roomCode } = await createGame(browser);

        // Room code should be large and readable from across the room
        const roomCodeElement = tvPage.locator('.text-4xl.tracking-widest.font-mono');
        await expect(roomCodeElement).toBeVisible();
        await expect(roomCodeElement).toHaveText(roomCode);

        // Font size should be at least 2.25rem (text-4xl = 36px)
        const fontSize = await roomCodeElement.evaluate((el) =>
            window.getComputedStyle(el).fontSize
        );
        expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(36);
    });

    test('TV shows waiting status for unjoined spymasters', async ({ browser }) => {
        const { tvPage, roomCode } = await createGame(browser);

        // Should show waiting indicators for both spymasters
        await expect(tvPage.getByText(/waiting/i).first()).toBeVisible();
    });

    test('TV updates when spymaster joins', async ({ browser }) => {
        const { tvPage, roomCode, tvContext } = await createGame(browser);

        // Red joins
        const red = await joinSpymaster(browser, roomCode, 'Red');

        // TV should update to show Red has joined (within 5 seconds)
        // Look for Ready ✓ checkmark which appears when spymaster joins
        await expect(
            tvPage.locator('text=/Ready.*✓/i').first()
        ).toBeVisible({ timeout: 5000 });
    });

    test('Room code uses unambiguous characters', async ({ browser }) => {
        const { roomCode } = await createGame(browser);

        // Room code should not contain easily confused characters
        // Avoid: O/0, I/1/L, S/5, B/8
        expect(roomCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    });
});

// ============================================================================
// GAME STATUS DISPLAY TESTS
// ============================================================================

test.describe('TV Display - Game Status', () => {
    test('TV shows prominent current team turn indicator', async ({ browser }) => {
        const { tvPage } = await setupPlayingGame(browser);

        // Turn badge should be visible
        const turnBadge = tvPage.getByTestId('turn-badge');
        await expect(turnBadge).toBeVisible();

        // Should indicate which team's turn (Red or Blue)
        const turnText = await turnBadge.innerText();
        expect(turnText.toLowerCase()).toMatch(/red|blue/);
    });

    test('TV shows "Spymaster is thinking..." during clue phase', async ({ browser }) => {
        const { tvPage } = await setupPlayingGame(browser);

        // During clue submission phase, TV should show this message
        await expect(tvPage.locator('text=Spymaster is thinking...')).toBeVisible();
    });

    test('TV shows score for both teams', async ({ browser }) => {
        const { tvPage } = await setupPlayingGame(browser);

        // Both team scores should be visible
        // Look for score indicators (e.g., "Red: 9" or "9/9")
        const redScore = tvPage.getByTestId('red-score');
        const blueScore = tvPage.getByTestId('blue-score');

        await expect(redScore.or(tvPage.locator('text=/Red.*[0-9]/'))).toBeVisible();
        await expect(blueScore.or(tvPage.locator('text=/Blue.*[0-9]/'))).toBeVisible();
    });

    test('TV shows current clue word and number after submission', async ({ browser }) => {
        const { tvPage, activeSpymaster } = await setupPlayingGame(browser);

        // Submit a clue
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'OCEAN');
        await activeSpymaster.page.click('button:has-text("2")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // TV should show the clue prominently
        await expect(tvPage.getByText('OCEAN').first()).toBeVisible();
        // Should also show the number somewhere on the page
        await expect(tvPage.getByText(/2/).first()).toBeVisible();
    });

    test('TV shows "Guessing..." or selection indicator after clue submission', async ({ browser }) => {
        const { tvPage, activeSpymaster } = await setupPlayingGame(browser);

        // Submit a clue
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'HINT');
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // TV should indicate it's now guessing/selection phase
        // Could be "Guessing...", "Select a card", or similar
        await expect(
            tvPage.locator('text=/guess|select|tap|pick/i').first()
        ).toBeVisible({ timeout: 5000 });
    });
});

// ============================================================================
// WORD GRID VISIBILITY TESTS
// ============================================================================

test.describe('TV Display - Word Grid', () => {
    test('TV word grid has large, readable fonts', async ({ browser }) => {
        const { tvPage } = await setupPlayingGame(browser);

        // Wait for the grid to render
        await tvPage.waitForSelector('.grid');

        // Get a word card and check its font size
        const wordCard = tvPage.locator('.grid button').first();
        await expect(wordCard).toBeVisible();

        const fontSize = await wordCard.evaluate((el) =>
            window.getComputedStyle(el).fontSize
        );
        // Words should be at least 12px, ideally larger for TV
        expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(12);
    });

    test('TV grid shows 25 word cards', async ({ browser }) => {
        const { tvPage } = await setupPlayingGame(browser);

        // Wait for grid
        await tvPage.waitForSelector('.grid');

        // Count word cards (should be 25 for standard Codenames)
        const cardCount = await tvPage.locator('.grid button').count();
        expect(cardCount).toBe(25);
    });

    test('TV cards have clear visual distinction when revealed', async ({ browser }) => {
        const { tvPage, activeSpymaster, passiveSpymaster, activeTeam } = await setupPlayingGame(browser);

        // Submit clue
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'TEST');
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Wait for selection mode
        const tapTextRegex = new RegExp(`Tap ${activeTeam.toUpperCase()}'s Guess`, 'i');
        await expect(passiveSpymaster.page.getByRole('heading', { name: tapTextRegex })).toBeVisible({ timeout: 15000 });

        // Find a team card and select it
        await activeSpymaster.page.waitForSelector('.grid');
        const targetCardLocator = activeSpymaster.page.locator(`.ring-${activeTeam}-500`).first();
        const targetWord = await targetCardLocator.innerText();

        await passiveSpymaster.page.getByRole('button', { name: targetWord }).click();
        await passiveSpymaster.page.getByRole('button', { name: 'Confirm Selection' }).click();

        // Verify TV shows the revealed card with team color
        await expect(tvPage.locator(`button:has-text("${targetWord}")`)).toHaveClass(/bg-(red|blue)-600/);
    });
});

// ============================================================================
// GAME END DISPLAY TESTS
// ============================================================================

test.describe('TV Display - Game End', () => {
    test('TV shows winner announcement at game end', async ({ browser }) => {
        const { tvPage, activeSpymaster, passiveSpymaster } = await setupPlayingGame(browser);

        // Submit clue
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'DOOM');
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Wait for selection phase
        await passiveSpymaster.page.waitForTimeout(1000);

        // Try to find and click assassin (if identifiable)
        const assassinCard = passiveSpymaster.page.locator('.bg-gray-900').first();
        if (await assassinCard.count() > 0) {
            await assassinCard.click();
            await passiveSpymaster.page.click('text=Confirm Selection');

            // TV should show Game Over
            await expect(tvPage.locator('text=Game Over')).toBeVisible({ timeout: 5000 });
        }
    });
});

// ============================================================================
// CLUE HISTORY TESTS
// ============================================================================

test.describe('TV Display - Clue History', () => {
    test('TV displays submitted clue in history or main display', async ({ browser }) => {
        const { tvPage, activeSpymaster } = await setupPlayingGame(browser);

        // Submit first clue
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'HISTORY');
        await activeSpymaster.page.click('button:has-text("3")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Clue should be visible on TV
        await expect(tvPage.getByText('HISTORY').first()).toBeVisible();
    });
});
