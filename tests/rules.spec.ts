
import { test, expect } from '@playwright/test';

// Helper: Setup game and get directly to playing state
async function setupPlayingGame(browser) {
    const tvContext = await browser.newContext();
    const tvPage = await tvContext.newPage();
    await tvPage.goto('/');

    await tvPage.click('text=Create New Game');
    const roomCodeElement = tvPage.locator('.text-4xl.tracking-widest.font-mono');
    await expect(roomCodeElement).toBeVisible();
    const roomCode = await roomCodeElement.innerText();

    const redContext = await browser.newContext();
    const redPage = await redContext.newPage();
    await redPage.goto(`/join/${roomCode}`);
    await redPage.getByRole('button', { name: 'Red Spymaster' }).click();

    const blueContext = await browser.newContext();
    const bluePage = await blueContext.newPage();
    await bluePage.goto(`/join/${roomCode}`);
    await bluePage.getByRole('button', { name: 'Blue Spymaster' }).click();

    await redPage.click('text=Start Game');
    await expect(tvPage.locator('text=Spymaster is thinking...')).toBeVisible({ timeout: 10000 });

    // Determine who starts
    const turnText = await tvPage.getByTestId('turn-badge').innerText();
    const isRedTurn = turnText.toLowerCase().includes('red');
    const activePage = isRedTurn ? redPage : bluePage;
    const passivePage = isRedTurn ? bluePage : redPage;
    const activeTeam = isRedTurn ? 'Red' : 'Blue';

    return { tvPage, redPage, bluePage, activePage, passivePage, activeTeam };
}

test.describe('Game Rules', () => {

    test('Strict Clue Validation', async ({ browser }) => {
        const { activePage } = await setupPlayingGame(browser);

        // 1. Empty Clue
        await activePage.waitForSelector('input[placeholder="Enter one word..."]');
        await activePage.fill('input[placeholder="Enter one word..."]', '   ');
        await activePage.click('button:has-text("1")');
        // Button should be disabled for empty input
        await expect(activePage.locator('button:has-text("Submit Clue")')).toBeDisabled();

        // 2. Multi-word
        await activePage.fill('input[placeholder="Enter one word..."]', 'BLUE SKY');
        await activePage.click('button:has-text("Submit Clue")');
        await expect(activePage.locator('text=Clue must be a single word')).toBeVisible();

        // 3. Board Word (Tricky to test dynamically without knowing board)
        // But we can try to find a word on the board text and type it.
        // The Spymaster view has texts on cards.
        const boardWord = await activePage.locator('.text-xs.font-bold').first().innerText();
        await activePage.fill('input[placeholder="Enter one word..."]', boardWord);
        await activePage.click('button:has-text("Submit Clue")');
        await expect(activePage.locator(`text=Clue matches board word`)).toBeVisible();
    });

    test('N+1 Guesses Rule & Turn Switching', async ({ browser }) => {
        const { activePage, passivePage, tvPage, activeTeam } = await setupPlayingGame(browser);

        // 1. Give clue "TEST" 1
        await activePage.waitForSelector('input[placeholder="Enter one word..."]');
        await activePage.fill('input[placeholder="Enter one word..."]', 'TEST');
        await activePage.click('button:has-text("1")');
        await activePage.click('button:has-text("Submit Clue")');

        // 2. Passive spymaster (selector) should see 2 guesses remaining (1 + 1)
        // Wait for UI update
        await expect(passivePage.locator("text=0 / 2")).toBeVisible();
        // Need to ensure UI shows this count. Assuming it does or we check server logic via behavior.

        // 3. Select 1 correct card
        // Wait for Selection Mode
        const tapTextRegex = new RegExp(`Tap ${activeTeam.toUpperCase()}'s Guess`, 'i');
        await expect(passivePage.getByRole('heading', { name: tapTextRegex })).toBeVisible();

        // Active Page sees rings. Find a card of active team.
        await activePage.waitForSelector('.grid');
        const targetCardLocator = activePage.locator(`.ring-${activeTeam.toLowerCase()}-500`).first();
        const targetWord = (await targetCardLocator.innerText()).trim();
        console.log(`[Rules] Clicking card: ${targetWord}`);

        await passivePage.getByRole('button', { name: targetWord }).click();

        // Confirm
        const confirmButton = passivePage.getByRole('button', { name: 'Confirm Selection' });
        await expect(confirmButton).toBeVisible({ timeout: 15000 });
        await confirmButton.click();

        // Alternative: Verify "End Turn Early" button exists
        // Alternative: Verify "End Turn Early" button exists for the ACTIVE spymaster (who watches)
        // Alternative: Verify "End Turn Early" button exists for the ACTIVE spymaster (who watches)
        await expect(activePage.locator('button:has-text("End Turn Early")')).toBeVisible({ timeout: 10000 });
        await activePage.click('button:has-text("End Turn Early")');

        // Verify turn switch
        // If Red ended, Blue should be active.
        // Check for Clue Input on the PREVIOUSLY passive page.
        await expect(passivePage.locator('input[placeholder="Enter one word..."]')).toBeVisible();
    });

});
