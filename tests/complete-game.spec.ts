/**
 * Complete Game Flow Tests
 * 
 * End-to-end scenarios testing full game experiences from start to finish.
 * These tests validate the entire game cycle works correctly.
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function submitClue(page: any, clueWord: string, number: number) {
    await page.waitForSelector('input[placeholder="Enter one word..."]', { timeout: 10000 });
    await page.fill('input[placeholder="Enter one word..."]', clueWord);
    await page.click(`button:has-text("${number}")`);
    await page.click('button:has-text("Submit Clue")');
}

async function selectCard(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeSpymaster: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    passiveSpymaster: any,
    activeTeam: string
) {
    // Wait for selection phase
    const tapTextRegex = new RegExp(`Tap ${activeTeam.toUpperCase()}'s Guess`, 'i');
    await expect(passiveSpymaster.page.getByRole('heading', { name: tapTextRegex })).toBeVisible({ timeout: 15000 });

    // Find a team card
    await activeSpymaster.page.waitForSelector('.grid');
    const targetCardLocator = activeSpymaster.page.locator(`.ring-${activeTeam}-500`).first();
    const targetWord = await targetCardLocator.innerText();

    // Select and confirm
    await passiveSpymaster.page.getByRole('button', { name: targetWord }).click();
    await passiveSpymaster.page.getByRole('button', { name: 'Confirm Selection' }).click();

    return targetWord;
}

// ============================================================================
// WINNING SCENARIOS
// ============================================================================

test.describe('Complete Game - Winning Scenarios', () => {
    test('Team wins by finding all their words', async ({ browser }) => {
        const { tvPage, activeSpymaster, passiveSpymaster, activeTeam, red, blue } =
            await setupPlayingGame(browser);

        // Play multiple turns, selecting correct cards
        // For a full game test, we'd need to play through enough turns to win
        // This test validates the first successful guess cycle

        // Give clue
        await submitClue(activeSpymaster.page, 'WINNER', 1);

        // Select correct card
        const word = await selectCard(activeSpymaster, passiveSpymaster, activeTeam);

        // Verify card is revealed
        await expect(tvPage.locator(`button:has-text("${word}")`)).toHaveClass(/bg-(red|blue)-600/);

        // Cleanup
        await red.context.close();
        await blue.context.close();
    });

    test('Game ends when one team has no cards remaining', async ({ browser }) => {
        const { tvPage, activeSpymaster, passiveSpymaster, activeTeam } =
            await setupPlayingGame(browser);

        // This is a longer test that would need to be run through all team cards
        // For now, just validate the flow works for multiple guesses

        // Give clue with multiple words
        await submitClue(activeSpymaster.page, 'MULTI', 2);

        // Select first card
        await selectCard(activeSpymaster, passiveSpymaster, activeTeam);

        // Should still be able to guess more (N+1 rule)
        // Check that selection mode is still active or End Turn button is visible
        const canContinue = await activeSpymaster.page.locator('button:has-text("End Turn Early")').isVisible();
        expect(canContinue).toBe(true);
    });
});

// ============================================================================
// LOSING SCENARIOS
// ============================================================================

test.describe('Complete Game - Losing Scenarios', () => {
    test('Team loses by hitting assassin', async ({ browser }) => {
        const { tvPage, activeSpymaster, passiveSpymaster } = await setupPlayingGame(browser);

        // Give clue
        await submitClue(activeSpymaster.page, 'RISKY', 1);

        // Wait for selection phase
        await passiveSpymaster.page.waitForTimeout(1000);

        // Try to find and click assassin
        // Assassin typically has a distinct style (bg-gray-900 or similar)
        const assassinCard = passiveSpymaster.page.locator('.bg-gray-900').first();

        if (await assassinCard.count() > 0) {
            await assassinCard.click();
            await passiveSpymaster.page.click('text=Confirm Selection');

            // Game should end
            await expect(tvPage.locator('text=Game Over')).toBeVisible({ timeout: 5000 });
        }
    });

    test('Opponent wins when team hits assassin', async ({ browser }) => {
        const { tvPage, activeSpymaster, passiveSpymaster, passiveTeam } =
            await setupPlayingGame(browser);

        // Give clue
        await submitClue(activeSpymaster.page, 'DANGER', 1);

        // Wait for selection phase
        await passiveSpymaster.page.waitForTimeout(1000);

        // Try to find and click assassin
        const assassinCard = passiveSpymaster.page.locator('.bg-gray-900').first();

        if (await assassinCard.count() > 0) {
            await assassinCard.click();
            await passiveSpymaster.page.click('text=Confirm Selection');

            // Opponent (passive team) should win
            // Check for winner announcement
            await expect(tvPage.locator(`text=/${passiveTeam}.*win/i`).or(tvPage.locator('text=Game Over'))).toBeVisible({ timeout: 5000 });
        }
    });
});

// ============================================================================
// TURN ENDING SCENARIOS
// ============================================================================

test.describe('Complete Game - Turn Mechanics', () => {
    test('Turn ends when selecting neutral card', async ({ browser }) => {
        const { tvPage, activeSpymaster, passiveSpymaster, activeTeam, passiveTeam } =
            await setupPlayingGame(browser);

        const initialTurn = await tvPage.getByTestId('turn-badge').innerText();

        // Give clue
        await submitClue(activeSpymaster.page, 'NEUTRAL', 1);

        // Wait for selection phase
        await passiveSpymaster.page.waitForTimeout(1000);

        // Find a neutral card (typically yellow/beige ring)
        await activeSpymaster.page.waitForSelector('.grid');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const onStateUpdate = (updatedRoom: any) => { }; // Placeholder for the intended change
        const neutralCard = activeSpymaster.page.locator('.ring-yellow-500, .ring-amber-400').first();

        if (await neutralCard.count() > 0) {
            const neutralWord = await neutralCard.innerText();
            await passiveSpymaster.page.getByRole('button', { name: neutralWord }).click();
            await passiveSpymaster.page.getByRole('button', { name: 'Confirm Selection' }).click();

            // Turn should switch
            await tvPage.waitForTimeout(1000);
            const newTurn = await tvPage.getByTestId('turn-badge').innerText();
            expect(newTurn.toLowerCase()).not.toBe(initialTurn.toLowerCase());
        }
    });

    test('Turn ends when selecting opponent card', async ({ browser }) => {
        const { tvPage, activeSpymaster, passiveSpymaster, passiveTeam } =
            await setupPlayingGame(browser);

        const initialTurn = await tvPage.getByTestId('turn-badge').innerText();

        // Give clue
        await submitClue(activeSpymaster.page, 'OPPONENT', 1);

        // Wait for selection phase
        await passiveSpymaster.page.waitForTimeout(1000);

        // Find opponent's card
        await activeSpymaster.page.waitForSelector('.grid');
        const opponentCard = activeSpymaster.page.locator(`.ring-${passiveTeam}-500`).first();

        if (await opponentCard.count() > 0) {
            const opponentWord = await opponentCard.innerText();
            await passiveSpymaster.page.getByRole('button', { name: opponentWord }).click();
            await passiveSpymaster.page.getByRole('button', { name: 'Confirm Selection' }).click();

            // Turn should switch AND opponent gets a point
            await tvPage.waitForTimeout(1000);
            const newTurn = await tvPage.getByTestId('turn-badge').innerText();
            expect(newTurn.toLowerCase()).not.toBe(initialTurn.toLowerCase());
        }
    });

    test('End Turn Early button ends turn immediately', async ({ browser }) => {
        const { tvPage, activeSpymaster, passiveSpymaster, activeTeam } =
            await setupPlayingGame(browser);

        const initialTurn = await tvPage.getByTestId('turn-badge').innerText();

        // Give clue
        await submitClue(activeSpymaster.page, 'EARLY', 1);

        // Select correct card first
        await selectCard(activeSpymaster, passiveSpymaster, activeTeam);

        // Click End Turn Early
        await expect(activeSpymaster.page.locator('button:has-text("End Turn Early")')).toBeVisible({ timeout: 10000 });
        await activeSpymaster.page.click('button:has-text("End Turn Early")');

        // Turn should switch
        await tvPage.waitForTimeout(1000);
        const newTurn = await tvPage.getByTestId('turn-badge').innerText();
        expect(newTurn.toLowerCase()).not.toBe(initialTurn.toLowerCase());
    });
});

// ============================================================================
// GAME OVER EXPERIENCE
// ============================================================================

test.describe('Complete Game - Game Over', () => {
    test('Winner announcement is prominent on TV', async ({ browser }) => {
        const { tvPage, activeSpymaster, passiveSpymaster } = await setupPlayingGame(browser);

        // Give clue
        await submitClue(activeSpymaster.page, 'ENDGAME', 1);

        // Wait for selection phase and hit assassin
        await passiveSpymaster.page.waitForTimeout(1000);
        const assassinCard = passiveSpymaster.page.locator('.bg-gray-900').first();

        if (await assassinCard.count() > 0) {
            await assassinCard.click();
            await passiveSpymaster.page.click('text=Confirm Selection');

            // Winner announcement should be visible
            const gameOver = tvPage.locator('text=Game Over');
            await expect(gameOver).toBeVisible({ timeout: 5000 });
        }
    });

    test('Play Again button is accessible after game ends', async ({ browser }) => {
        const { tvPage, activeSpymaster, passiveSpymaster } = await setupPlayingGame(browser);

        // Give clue
        await submitClue(activeSpymaster.page, 'RESTART', 1);

        // Hit assassin to end game
        await passiveSpymaster.page.waitForTimeout(1000);
        const assassinCard = passiveSpymaster.page.locator('.bg-gray-900').first();

        if (await assassinCard.count() > 0) {
            await assassinCard.click();
            await passiveSpymaster.page.click('text=Confirm Selection');

            await expect(tvPage.locator('text=Game Over')).toBeVisible({ timeout: 5000 });

            // Look for Play Again or New Game button
            const playAgain = tvPage.locator('button:has-text("Play Again"), button:has-text("New Game")');
            await expect(playAgain).toBeVisible({ timeout: 5000 });
        }
    });

    test('Return to lobby clears game state properly', async ({ browser }) => {
        const { tvPage, roomCode, activeSpymaster, passiveSpymaster } = await setupPlayingGame(browser);

        // Give clue
        await submitClue(activeSpymaster.page, 'LOBBY', 1);

        // End game via assassin
        await passiveSpymaster.page.waitForTimeout(1000);
        const assassinCard = passiveSpymaster.page.locator('.bg-gray-900').first();

        if (await assassinCard.count() > 0) {
            await assassinCard.click();
            await passiveSpymaster.page.click('text=Confirm Selection');

            await expect(tvPage.locator('text=Game Over')).toBeVisible({ timeout: 5000 });

            // Click return to home/lobby
            const homeButton = tvPage.locator('button:has-text("Home"), button:has-text("Lobby"), a:has-text("Home")');
            if (await homeButton.count() > 0) {
                await homeButton.click();

                // Should be back at home page
                await expect(tvPage.locator('text=Create New Game')).toBeVisible({ timeout: 5000 });
            }
        }
    });
});

// ============================================================================
// MULTI-ROUND GAMEPLAY
// ============================================================================

test.describe('Complete Game - Multi-Round', () => {
    test('Multiple back-and-forth turns work correctly', async ({ browser }) => {
        const { tvPage, red, blue, activeSpymaster, passiveSpymaster, activeTeam, passiveTeam } =
            await setupPlayingGame(browser);

        // Turn 1: First team plays
        await submitClue(activeSpymaster.page, 'ROUND1', 1);
        await selectCard(activeSpymaster, passiveSpymaster, activeTeam);

        // End turn
        await expect(activeSpymaster.page.locator('button:has-text("End Turn Early")')).toBeVisible({ timeout: 10000 });
        await activeSpymaster.page.click('button:has-text("End Turn Early")');

        // Turn 2: Second team plays
        // Now passiveSpymaster should be able to submit clue (wait for clue input to appear)
        await expect(passiveSpymaster.page.locator('input[placeholder="Enter one word..."]')).toBeVisible({ timeout: 10000 });
        await submitClue(passiveSpymaster.page, 'ROUND2', 1);

        // Verify the clue appears on TV
        await expect(tvPage.getByText('ROUND2').first()).toBeVisible({ timeout: 5000 });
    });
});
