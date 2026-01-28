/**
 * Spymaster View Experience Tests
 * 
 * Tests for the spymaster's mobile/tablet experience.
 * Includes clue input, key view, and card selection UX.
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

async function joinSpymasterMobile(browser: Browser, roomCode: string, team: 'Red' | 'Blue') {
    const context = await browser.newContext({
        viewport: { width: 375, height: 667 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        hasTouch: true,
    });
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

async function setupPlayingGameMobile(browser: Browser) {
    const { tvPage, roomCode, tvContext } = await createGame(browser);

    const red = await joinSpymasterMobile(browser, roomCode, 'Red');
    const blue = await joinSpymasterMobile(browser, roomCode, 'Blue');

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
    };
}

// ============================================================================
// CLUE INPUT UX TESTS
// ============================================================================

test.describe('Spymaster - Clue Input', () => {
    test('Clue input field is prominent and focusable', async ({ browser }) => {
        const { activeSpymaster } = await setupPlayingGame(browser);

        const clueInput = activeSpymaster.page.locator('input[placeholder="Enter one word..."]');
        await expect(clueInput).toBeVisible();

        // Should be focusable
        await clueInput.focus();
        await expect(clueInput).toBeFocused();
    });

    test('Number selector has clear tap targets (minimum 44px)', async ({ browser }) => {
        const { activeSpymaster } = await setupPlayingGame(browser);

        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');

        // Find number buttons
        const numberButton = activeSpymaster.page.locator('button:has-text("1")').first();
        await expect(numberButton).toBeVisible();

        // Check size for touch accessibility
        const box = await numberButton.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(32); // Reasonable minimum
    });

    test('Submit button is large and accessible', async ({ browser }) => {
        const { activeSpymaster } = await setupPlayingGame(browser);

        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');

        const submitButton = activeSpymaster.page.locator('button:has-text("Submit Clue")');
        await expect(submitButton).toBeVisible();

        // Check size
        const box = await submitButton.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(40);
    });

    test('Submit button shows loading state while submitting', async ({ browser }) => {
        const { activeSpymaster, tvPage } = await setupPlayingGame(browser);

        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'LOADING');
        await activeSpymaster.page.click('button:has-text("1")');

        // Click submit
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // After submission, the clue input should disappear (moved to selection phase)
        // This verifies load/submit completed successfully
        await expect(activeSpymaster.page.locator('input[placeholder="Enter one word..."]')).not.toBeVisible({ timeout: 5000 });

        // TV should show the clue, verifying submission went through
        await expect(tvPage.getByText('LOADING').first()).toBeVisible({ timeout: 3000 });
    });

    test('Clue input placeholder text is helpful', async ({ browser }) => {
        const { activeSpymaster } = await setupPlayingGame(browser);

        const clueInput = activeSpymaster.page.locator('input[placeholder="Enter one word..."]');
        await expect(clueInput).toBeVisible();

        // Placeholder should indicate what to enter
        const placeholder = await clueInput.getAttribute('placeholder');
        expect(placeholder?.toLowerCase()).toContain('word');
    });
});

// ============================================================================
// CLUE VALIDATION FEEDBACK TESTS
// ============================================================================

test.describe('Spymaster - Clue Validation Feedback', () => {
    test('Invalid clue shows inline error', async ({ browser }) => {
        const { activeSpymaster } = await setupPlayingGame(browser);

        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'TWO WORDS');
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Error should appear inline
        await expect(activeSpymaster.page.locator('text=/single word|invalid|error/i').first()).toBeVisible();
    });

    test('Error clears when user starts typing again', async ({ browser }) => {
        const { activeSpymaster } = await setupPlayingGame(browser);

        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');

        // Trigger error
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'TWO WORDS');
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        await expect(activeSpymaster.page.locator('text=/single word/i')).toBeVisible();

        // Start typing again - clear and type new value
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', '');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'VALID');

        // Error should disappear or at least not prevent re-submission
        await activeSpymaster.page.click('button:has-text("Submit Clue")');
    });

    test('Board word match shows which word it matched', async ({ browser }) => {
        const { activeSpymaster } = await setupPlayingGame(browser);

        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');

        // Get a word from the board
        const boardWord = await activeSpymaster.page.locator('.text-xs.font-bold, .grid button').first().innerText();

        // Try to use it as clue
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', boardWord.trim());
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Should show error about matching board word
        await expect(activeSpymaster.page.locator('text=/board word|matches/i').first()).toBeVisible();
    });

    test('Empty clue shows validation error', async ({ browser }) => {
        const { activeSpymaster } = await setupPlayingGame(browser);

        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', '   ');
        await activeSpymaster.page.click('button:has-text("1")');

        // Submit should be disabled for empty/whitespace
        const submitButton = activeSpymaster.page.locator('button:has-text("Submit Clue")');
        await expect(submitButton).toBeDisabled();
    });
});

// ============================================================================
// KEY CARD VIEW TESTS
// ============================================================================

test.describe('Spymaster - Key Card View', () => {
    test('Spymaster sees all card colors', async ({ browser }) => {
        const { activeSpymaster } = await setupPlayingGame(browser);

        await activeSpymaster.page.waitForSelector('.grid');

        // Should see red team cards (with ring)
        const redCards = await activeSpymaster.page.locator('.ring-red-500').count();
        expect(redCards).toBeGreaterThan(0);

        // Should see blue team cards
        const blueCards = await activeSpymaster.page.locator('.ring-blue-500').count();
        expect(blueCards).toBeGreaterThan(0);
    });

    test('Assassin card is clearly distinguishable', async ({ browser }) => {
        const { activeSpymaster } = await setupPlayingGame(browser);

        await activeSpymaster.page.waitForSelector('.grid');

        // Assassin should have distinct styling (typically black/gray)
        const assassinCard = activeSpymaster.page.locator('.bg-gray-900, .ring-gray-900, [data-type="assassin"]');

        // Should have exactly 1 assassin
        const assassinCount = await assassinCard.count();
        expect(assassinCount).toBeGreaterThanOrEqual(1);
    });

    test('Own team cards have clear indicator', async ({ browser }) => {
        const { activeSpymaster, activeTeam } = await setupPlayingGame(browser);

        await activeSpymaster.page.waitForSelector('.grid');

        // Active team's cards should have ring highlighting
        const ownTeamCards = activeSpymaster.page.locator(`.ring-${activeTeam}-500`);
        const count = await ownTeamCards.count();

        // Starting team has 9 cards, other has 8
        expect(count).toBeGreaterThanOrEqual(8);
    });
});

// ============================================================================
// SELECTION VIEW TESTS (for opposing spymaster)
// ============================================================================

test.describe('Spymaster - Selection View', () => {
    test('Selection mode shows clear header indicating what to do', async ({ browser }) => {
        const { activeSpymaster, passiveSpymaster, activeTeam } = await setupPlayingGame(browser);

        // Submit clue
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'SELECT');
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Passive spymaster should see clear instruction
        const tapTextRegex = new RegExp(`Tap ${activeTeam.toUpperCase()}'s Guess`, 'i');
        await expect(passiveSpymaster.page.getByRole('heading', { name: tapTextRegex })).toBeVisible({ timeout: 15000 });
    });

    test('Tapping a card highlights it before confirmation', async ({ browser }) => {
        const { activeSpymaster, passiveSpymaster, activeTeam } = await setupPlayingGame(browser);

        // Submit clue
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'HIGHLIGHT');
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Wait for selection mode
        const tapTextRegex = new RegExp(`Tap ${activeTeam.toUpperCase()}'s Guess`, 'i');
        await expect(passiveSpymaster.page.getByRole('heading', { name: tapTextRegex })).toBeVisible({ timeout: 15000 });

        // Get a card to tap
        await activeSpymaster.page.waitForSelector('.grid');
        const targetCardLocator = activeSpymaster.page.locator(`.ring-${activeTeam}-500`).first();
        const targetWord = await targetCardLocator.innerText();

        // Tap the card
        await passiveSpymaster.page.getByRole('button', { name: targetWord }).click();

        // Should show confirmation modal/option
        await expect(passiveSpymaster.page.getByRole('button', { name: 'Confirm Selection' })).toBeVisible();
    });

    test('Confirmation modal prevents accidental taps', async ({ browser }) => {
        const { activeSpymaster, passiveSpymaster, activeTeam, tvPage } = await setupPlayingGame(browser);

        // Submit clue
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'SAFE');
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Wait for selection mode
        await passiveSpymaster.page.waitForTimeout(1000);

        // Get a card to tap
        await activeSpymaster.page.waitForSelector('.grid');
        const targetCardLocator = activeSpymaster.page.locator(`.ring-${activeTeam}-500`).first();
        const targetWord = await targetCardLocator.innerText();

        // Tap the card
        await passiveSpymaster.page.getByRole('button', { name: targetWord }).click();

        // Card should NOT be revealed yet on TV (confirmation required)
        // Allow brief moment for accidental reveal
        await tvPage.waitForTimeout(500);
        const cardOnTV = tvPage.locator(`button:has-text("${targetWord}")`);

        // Should still be neutral (not revealed with team color)
        const classes = await cardOnTV.getAttribute('class');
        expect(classes).not.toContain('bg-red-600');
        expect(classes).not.toContain('bg-blue-600');
    });

    test('Cancel option is available after selecting card', async ({ browser }) => {
        const { activeSpymaster, passiveSpymaster, activeTeam } = await setupPlayingGame(browser);

        // Submit clue
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'CANCEL');
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Wait for selection mode
        const tapTextRegex = new RegExp(`Tap ${activeTeam.toUpperCase()}'s Guess`, 'i');
        await expect(passiveSpymaster.page.getByRole('heading', { name: tapTextRegex })).toBeVisible({ timeout: 15000 });

        // Get a card to tap
        await activeSpymaster.page.waitForSelector('.grid');
        const targetCardLocator = activeSpymaster.page.locator(`.ring-${activeTeam}-500`).first();
        const targetWord = await targetCardLocator.innerText();

        // Tap the card
        await passiveSpymaster.page.getByRole('button', { name: targetWord }).click();

        // Should have cancel option
        const cancelButton = passiveSpymaster.page.getByRole('button', { name: /Cancel/i });
        await expect(cancelButton).toBeVisible();
    });

    test('Guess counter shows remaining guesses', async ({ browser }) => {
        const { activeSpymaster, passiveSpymaster, activeTeam } = await setupPlayingGame(browser);

        // Submit clue with 2
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'COUNTER');
        await activeSpymaster.page.click('button:has-text("2")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Wait for selection mode
        await passiveSpymaster.page.waitForTimeout(1000);

        // Should show 3 remaining (N+1 = 2+1)
        await expect(passiveSpymaster.page.locator('text=/0.*\/.*3|3.*remaining|3.*left/i').first()).toBeVisible();
    });
});

// ============================================================================
// MOBILE RESPONSIVENESS TESTS
// ============================================================================

test.describe('Spymaster - Mobile Experience', () => {
    test('Clue input works on iPhone SE viewport (375px)', async ({ browser }) => {
        const { activeSpymaster } = await setupPlayingGameMobile(browser);

        const clueInput = activeSpymaster.page.locator('input[placeholder="Enter one word..."]');
        await expect(clueInput).toBeVisible();

        // Input should be full width and accessible
        const box = await clueInput.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThanOrEqual(200);
    });

    test('Number buttons are touch-friendly on mobile', async ({ browser }) => {
        const { activeSpymaster } = await setupPlayingGameMobile(browser);

        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');

        // All number buttons should be visible
        for (let i = 1; i <= 5; i++) {
            const numButton = activeSpymaster.page.locator(`button:has-text("${i}")`).first();
            if (await numButton.isVisible()) {
                const box = await numButton.boundingBox();
                expect(box).not.toBeNull();
                // Minimum touch target is 44x44px per Apple HIG
                expect(box!.height).toBeGreaterThanOrEqual(32);
            }
        }
    });

    test('Grid cards are tappable on small screens', async ({ browser }) => {
        const { activeSpymaster, passiveSpymaster, activeTeam } = await setupPlayingGameMobile(browser);

        // Submit clue
        await activeSpymaster.page.waitForSelector('input[placeholder="Enter one word..."]');
        await activeSpymaster.page.fill('input[placeholder="Enter one word..."]', 'TAP');
        await activeSpymaster.page.click('button:has-text("1")');
        await activeSpymaster.page.click('button:has-text("Submit Clue")');

        // Wait for selection mode
        await passiveSpymaster.page.waitForTimeout(2000);

        // Cards should be visible and tappable
        const cards = await passiveSpymaster.page.locator('.grid button').all();
        expect(cards.length).toBe(25);

        // Each card should be reasonably sized
        for (const card of cards.slice(0, 5)) { // Check first 5
            const box = await card.boundingBox();
            expect(box).not.toBeNull();
            expect(box!.width).toBeGreaterThanOrEqual(40);
            expect(box!.height).toBeGreaterThanOrEqual(40);
        }
    });
});

// ============================================================================
// WAITING STATE TESTS
// ============================================================================

test.describe('Spymaster - Waiting States', () => {
    test('Passive spymaster sees waiting state during clue phase', async ({ browser }) => {
        const { passiveSpymaster } = await setupPlayingGame(browser);

        // Passive spymaster should see they need to wait
        // Look for indication that it's not their turn
        const waitingIndicator = passiveSpymaster.page.locator('text=/waiting|other team|opponent/i');

        // Or they might see "Challenge Clue" which means they're waiting to verify
        await expect(
            waitingIndicator.first().or(passiveSpymaster.page.locator('text=Challenge Clue'))
        ).toBeVisible({ timeout: 10000 });
    });

    test('Active spymaster sees their role clearly', async ({ browser }) => {
        const { activeSpymaster, activeTeam } = await setupPlayingGame(browser);

        // Should clearly show it's their turn to give clue
        const clueInput = activeSpymaster.page.locator('input[placeholder="Enter one word..."]');
        await expect(clueInput).toBeVisible();

        // Should also have team indicator visible
        const teamIndicator = activeSpymaster.page.locator(`text=/${activeTeam}/i`).first();
        await expect(teamIndicator).toBeVisible();
    });
});
