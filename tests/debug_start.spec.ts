
import { test, expect } from '@playwright/test';

async function setupGame(browser) {
    const tvContext = await browser.newContext();
    const tvPage = await tvContext.newPage();

    // Listen to logs
    tvPage.on('console', msg => console.log(`[TV] ${msg.text()}`));

    await tvPage.goto('/');

    await tvPage.click('text=Create New Game');
    const roomCodeElement = tvPage.locator('.text-4xl.tracking-widest.font-mono');
    await expect(roomCodeElement).toBeVisible();
    const roomCode = await roomCodeElement.innerText();
    console.log(`Room Code: ${roomCode}`);

    const redContext = await browser.newContext();
    const redPage = await redContext.newPage();
    await redPage.goto(`/join/${roomCode}`);
    await redPage.getByRole('button', { name: 'Red Spymaster' }).click();

    const blueContext = await browser.newContext();
    const bluePage = await blueContext.newPage();
    await bluePage.goto(`/join/${roomCode}`);
    await bluePage.getByRole('button', { name: 'Blue Spymaster' }).click();

    // Debug: Check if Start Game is enabled
    const startBtn = redPage.getByRole('button', { name: 'Start Game' });
    if (await startBtn.isDisabled()) {
        console.log("Start Game Button DISABLED");
    } else {
        console.log("Start Game Button ENABLED");
        await startBtn.click();
        console.log("Clicked Start Game");
    }

    // Wait 5s
    await tvPage.waitForTimeout(5000);

    // Dump TV Body
    const body = await tvPage.innerText('body');
    console.log("TV Body Dump:", body);
}

test('Debug Start Game', async ({ browser }) => {
    await setupGame(browser);
});
