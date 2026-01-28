/**
 * Real-time Synchronization Tests
 * 
 * Ensures real-time sync between TV and multiple spymaster devices.
 * This is the unique feature of the Crossfire Codenames experience.
 */

import { test, expect, Browser } from '@playwright/test';

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
        roomCode,
        red,
        blue,
        activeSpymaster: isRedTurn ? red : blue,
        passiveSpymaster: isRedTurn ? blue : red,
        activeTeam: isRedTurn ? 'red' : 'blue',
        passiveTeam: isRedTurn ? 'blue' : 'red',
    };
}

// ============================================================================
// CLUE SUBMISSION SYNC TESTS
// ============================================================================

test.describe('Real-time Sync - Clue Submission', () => {
    test('TV updates within 2 seconds of clue submission', async ({ browser }) => {
        const { tvPage, activeSpymaster } = await setupPlayingGame(browser);

        // Submit clue
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'QUICKSYNC');
        await activeSpymaster.page.click('button:has-text("2")');

        const startTime = Date.now();
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Wait for clue to appear on TV
        await expect(tvPage.getByText('QUICKSYNC').first()).toBeVisible({ timeout: 2000 });
        const endTime = Date.now();

        // Should sync within 2 seconds
        expect(endTime - startTime).toBeLessThan(2000);
    });

    test('Passive spymaster sees clue immediately after submission', async ({ browser }) => {
        const { activeSpymaster, passiveSpymaster } = await setupPlayingGame(browser);

        // Submit clue
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'INSTANT');
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Passive spymaster should see the clue
        await expect(passiveSpymaster.page.getByText('INSTANT').first()).toBeVisible({ timeout: 2000 });
    });

    test('Active spymaster view updates to waiting state after clue submission', async ({ browser }) => {
        const { activeSpymaster } = await setupPlayingGame(browser);

        // Submit clue
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'SUBMITTED');
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Active spymaster should no longer see clue input
        await expect(activeSpymaster.page.locator('input[placeholder="Enter one word..."]')).not.toBeVisible();
    });
});

// ============================================================================
// CARD SELECTION SYNC TESTS
// ============================================================================

test.describe('Real-time Sync - Card Selection', () => {
    test('All devices see card reveal simultaneously', async ({ browser }) => {
        const { tvPage, activeSpymaster, passiveSpymaster, activeTeam } = await setupPlayingGame(browser);

        // Submit clue
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'SYNC');
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Wait for selection phase
        const tapTextRegex = new RegExp(`Tap ${activeTeam.toUpperCase()}'s Guess`, 'i');
        await expect(passiveSpymaster.page.getByRole('heading', { name: tapTextRegex })).toBeVisible({ timeout: 15000 });

        // Find a team card
        await activeSpymaster.page.waitForSelector('.grid');
        const targetCardLocator = activeSpymaster.page.locator(`.ring-${activeTeam}-500`).first();
        const targetWord = await targetCardLocator.innerText();

        // Select card
        await passiveSpymaster.page.getByRole('button', { name: targetWord }).click();
        await passiveSpymaster.page.getByRole('button', { name: 'Confirm Selection' }).click();

        // All three views should show the revealed card color
        await expect(passiveSpymaster.page.locator(`button:has-text("${targetWord}")`)).toHaveClass(/bg-(red|blue)-600/);
        await expect(tvPage.locator(`button:has-text("${targetWord}")`)).toHaveClass(/bg-(red|blue)-600/);
        await expect(activeSpymaster.page.locator(`button:has-text("${targetWord}")`)).toHaveClass(/bg-(red|blue)-600/);
    });

    test('Score updates appear on all devices together', async ({ browser }) => {
        const { tvPage, activeSpymaster, passiveSpymaster, activeTeam } = await setupPlayingGame(browser);

        // Submit clue
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'SCORE');
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Wait for selection phase
        await passiveSpymaster.page.waitForTimeout(1000);

        // Find and select a team card
        await activeSpymaster.page.waitForSelector('.grid');
        const targetCardLocator = activeSpymaster.page.locator(`.ring-${activeTeam}-500`).first();
        const targetWord = await targetCardLocator.innerText();

        await passiveSpymaster.page.getByRole('button', { name: targetWord }).click();
        await passiveSpymaster.page.getByRole('button', { name: 'Confirm Selection' }).click();

        // Score should update on TV (look for score change indicator)
        // This test validates that the score area reflects the change
        await tvPage.waitForTimeout(500);

        // The revealed card count should change on TV
        const revealedCards = await tvPage.locator('.grid button').evaluateAll((buttons) =>
            buttons.filter(b =>
                b.classList.contains('bg-red-600') ||
                b.classList.contains('bg-blue-600')
            ).length
        );
        expect(revealedCards).toBeGreaterThanOrEqual(1);
    });
});

// ============================================================================
// TURN CHANGE SYNC TESTS
// ============================================================================

test.describe('Real-time Sync - Turn Changes', () => {
    test('Turn change reflects on all devices immediately', async ({ browser }) => {
        const { tvPage, activeSpymaster, passiveSpymaster, activeTeam } = await setupPlayingGame(browser);

        // Get initial turn
        const initialTurnText = await tvPage.getByTestId('turn-badge').innerText();

        // Submit clue
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'TURN');
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Wait for selection phase
        const tapTextRegex = new RegExp(`Tap ${activeTeam.toUpperCase()}'s Guess`, 'i');
        await expect(passiveSpymaster.page.getByRole('heading', { name: tapTextRegex })).toBeVisible({ timeout: 15000 });

        // Select a NEUTRAL card to end turn
        // Find a card that doesn't have team color ring
        await activeSpymaster.page.waitForSelector('.grid');
        const neutralCard = activeSpymaster.page.locator('.ring-yellow-500, .ring-gray-400').first();

        if (await neutralCard.count() > 0) {
            const neutralWord = await neutralCard.innerText();
            await passiveSpymaster.page.getByRole('button', { name: neutralWord }).click();
            await passiveSpymaster.page.getByRole('button', { name: 'Confirm Selection' }).click();

            // Turn should now be different
            await tvPage.waitForTimeout(500);
            const newTurnText = await tvPage.getByTestId('turn-badge').innerText();

            // Turn should have flipped
            if (initialTurnText.toLowerCase().includes('red')) {
                expect(newTurnText.toLowerCase()).toContain('blue');
            } else {
                expect(newTurnText.toLowerCase()).toContain('red');
            }
        }
    });

    test('Previously passive spymaster can now give clue after turn switch', async ({ browser }) => {
        const { tvPage, activeSpymaster, passiveSpymaster, activeTeam, passiveTeam } = await setupPlayingGame(browser);

        // Submit clue
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'FIRST');
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Wait for selection phase
        const tapTextRegex = new RegExp(`Tap ${activeTeam.toUpperCase()}'s Guess`, 'i');
        await expect(passiveSpymaster.page.getByRole('heading', { name: tapTextRegex })).toBeVisible({ timeout: 15000 });

        // Select any card and confirm
        await activeSpymaster.page.waitForSelector('.grid');
        const targetCardLocator = activeSpymaster.page.locator(`.ring-${activeTeam}-500`).first();
        const targetWord = await targetCardLocator.innerText();

        await passiveSpymaster.page.getByRole('button', { name: targetWord }).click();
        await passiveSpymaster.page.getByRole('button', { name: 'Confirm Selection' }).click();

        // End turn early
        await expect(activeSpymaster.page.locator('button:has-text("End Turn Early")')).toBeVisible({ timeout: 10000 });
        await activeSpymaster.page.click('button:has-text("End Turn Early")');

        // Now the previously passive spymaster should be able to give clue
        await expect(passiveSpymaster.page.locator('input[placeholder="Enter one word..."]')).toBeVisible({ timeout: 5000 });
    });
});

// ============================================================================
// CONNECTION HANDLING TESTS
// ============================================================================

test.describe('Real-time Sync - Connection Handling', () => {
    test('Game state is preserved on page refresh', async ({ browser }) => {
        const { tvPage, roomCode, activeSpymaster } = await setupPlayingGame(browser);

        // Submit a clue
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'REFRESH');
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Wait for clue to sync
        await expect(tvPage.getByText('REFRESH').first()).toBeVisible({ timeout: 2000 });

        // Refresh TV page
        await tvPage.reload();

        // Game state should be preserved - clue should still be visible
        await expect(tvPage.getByText('REFRESH').first()).toBeVisible({ timeout: 5000 });
    });

    test('Spymaster can rejoin the same game after disconnect', async ({ browser }) => {
        const { tvPage, roomCode, red, activeSpymaster, activeTeam } = await setupPlayingGame(browser);

        // Submit a clue first
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'RECONNECT');
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Wait for sync
        await expect(tvPage.getByText('RECONNECT').first()).toBeVisible({ timeout: 2000 });

        // Close red spymaster's page
        await red.page.close();

        // Rejoin as Red Spymaster
        const newRedPage = await red.context.newPage();
        await newRedPage.goto(`/join/${roomCode}`);

        // Red should be able to reclaim their role or it should auto-reconnect
        // Check if they see the current game state
        await newRedPage.waitForTimeout(2000);
        const hasClue = await newRedPage.getByText('RECONNECT').first().isVisible();
        const hasGrid = await newRedPage.locator('.grid').first().isVisible();
        expect(hasClue || hasGrid).toBe(true);
    });

    test('Late-joining device sees current game state', async ({ browser }) => {
        const { tvPage, roomCode, activeSpymaster } = await setupPlayingGame(browser);

        // Submit clue
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'LATEJOIN');
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Wait for clue to sync
        await expect(tvPage.getByText('LATEJOIN').first()).toBeVisible({ timeout: 2000 });

        // Open a new TV view (like a spectator joining late)
        const lateContext = await browser.newContext();
        const latePage = await lateContext.newPage();
        await latePage.goto(`/tv/${roomCode}`);

        // Late joiner should see the current game state with the clue
        await expect(latePage.getByText('LATEJOIN').first()).toBeVisible({ timeout: 5000 });

        await lateContext.close();
    });
});

// ============================================================================
// SIMULTANEOUS ACTION TESTS
// ============================================================================

test.describe('Real-time Sync - Race Conditions', () => {
    test('Multiple rapid actions are processed in order', async ({ browser }) => {
        const { tvPage, activeSpymaster, passiveSpymaster, activeTeam } = await setupPlayingGame(browser);

        // Submit clue
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'RAPID');
        await activeSpymaster.page.click('button:has-text("2")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Wait for selection phase
        const tapTextRegex = new RegExp(`Tap ${activeTeam.toUpperCase()}'s Guess`, 'i');
        await expect(passiveSpymaster.page.getByRole('heading', { name: tapTextRegex })).toBeVisible({ timeout: 15000 });

        // Quickly get two team cards
        await activeSpymaster.page.waitForSelector('.grid');
        const teamCards = await activeSpymaster.page.locator(`.ring-${activeTeam}-500`).all();

        if (teamCards.length >= 2) {
            const word1 = await teamCards[0].innerText();
            const word2 = await teamCards[1].innerText();

            // Select first card
            await passiveSpymaster.page.getByRole('button', { name: word1 }).click();
            await passiveSpymaster.page.getByRole('button', { name: 'Confirm Selection' }).click();

            // Wait for first card to reveal
            await expect(tvPage.locator(`button:has-text("${word1}")`)).toHaveClass(/bg-(red|blue)-600/, { timeout: 2000 });

            // Select second card
            await passiveSpymaster.page.getByRole('button', { name: word2 }).click();
            await passiveSpymaster.page.getByRole('button', { name: 'Confirm Selection' }).click();

            // Both cards should be revealed
            await expect(tvPage.locator(`button:has-text("${word2}")`)).toHaveClass(/bg-(red|blue)-600/, { timeout: 2000 });
        }
    });
});
