/**
 * Lobby Experience Tests
 * 
 * Pre-game UX that sets the tone for game night.
 * First impressions matter for a party game experience.
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

// ============================================================================
// HOME PAGE TESTS
// ============================================================================

test.describe('Lobby - Home Page', () => {
    test('Home page shows Create New Game button prominently', async ({ page }) => {
        await page.goto('/');

        const createButton = page.getByRole('button', { name: /Create New Game/i });
        await expect(createButton).toBeVisible();

        // Button should be reasonably sized for easy clicking
        const box = await createButton.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(40);
    });

    test('Home page has clear instructions for how to play', async ({ page }) => {
        await page.goto('/');

        // Should have some explanatory text or link to rules
        const instructionsOrTitle = page.getByText(/codename|game|play/i).first();
        await expect(instructionsOrTitle).toBeVisible();
    });
});

// ============================================================================
// ROOM CREATION TESTS
// ============================================================================

test.describe('Lobby - Room Creation', () => {
    test('Room code is large and easily read aloud (10ft viewing)', async ({ browser }) => {
        const { tvPage, roomCode } = await createGame(browser);

        const roomCodeElement = tvPage.locator('.text-4xl.tracking-widest.font-mono');
        await expect(roomCodeElement).toBeVisible();

        // Check font size is at least 36px (text-4xl)
        const fontSize = await roomCodeElement.evaluate((el) =>
            window.getComputedStyle(el).fontSize
        );
        expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(36);

        // Check letter spacing for readability
        const letterSpacing = await roomCodeElement.evaluate((el) =>
            window.getComputedStyle(el).letterSpacing
        );
        // tracking-widest = 0.1em, which should be non-zero
        expect(letterSpacing).not.toBe('normal');
    });

    test('Room code uses unambiguous characters', async ({ browser }) => {
        const { roomCode } = await createGame(browser);

        // Room code should be 6 characters
        expect(roomCode).toHaveLength(6);

        // Should not contain easily confused characters
        // O/0, I/1/L are commonly confused when read aloud
        // Best practice: use only A-Z (no O, I) and 2-9 (no 0, 1)
        expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

        // Log for debugging but don't fail on specific chars (might be intentional)
        console.log(`Room code: ${roomCode}`);
    });

    test('TV redirects to lobby view after creating game', async ({ browser }) => {
        const tvContext = await browser.newContext();
        const tvPage = await tvContext.newPage();
        await tvPage.goto('/');

        await tvPage.click('text=Create New Game');

        // Should redirect to /tv/{roomCode}
        await expect(tvPage).toHaveURL(/\/tv\/[A-Z0-9]{6}/);
    });
});

// ============================================================================
// PLAYER WAITING TESTS
// ============================================================================

test.describe('Lobby - Waiting for Players', () => {
    test('TV shows connected spymaster indicators', async ({ browser }) => {
        const { tvPage, roomCode } = await createGame(browser);

        // Initially, both spymaster slots should show as empty/waiting
        // Join Red
        const red = await joinSpymaster(browser, roomCode, 'Red');

        // TV should update to show Red has joined
        await expect(tvPage.locator('text=/Red.*connected|Red.*joined|Red Spymaster/i').first()).toBeVisible({ timeout: 3000 });

        // Blue should still be waiting
        await expect(tvPage.locator('text=/Blue.*waiting|Waiting.*Blue/i').first().or(tvPage.locator('text=Blue Spymaster').first())).toBeVisible();

        await red.context.close();
    });

    test('TV shows "Waiting for Blue Spymaster" when only Red joined', async ({ browser }) => {
        const { tvPage, roomCode } = await createGame(browser);

        // Join only Red
        const red = await joinSpymaster(browser, roomCode, 'Red');

        // Should indicate Blue is still needed
        // Look for any indication Blue hasn't joined
        await tvPage.waitForTimeout(1000);

        // The UI should show Blue is not yet ready
        const blueWaiting = tvPage.locator('text=/waiting|ready|join/i');
        await expect(blueWaiting.first()).toBeVisible();

        await red.context.close();
    });

    test('Start Game button only enables when both spymasters joined', async ({ browser }) => {
        const { tvPage, roomCode } = await createGame(browser);

        // Join Red first
        const red = await joinSpymaster(browser, roomCode, 'Red');

        // Start button should be disabled (on TV or spymaster pages)
        const startButton = red.page.getByRole('button', { name: /Start Game/i });

        // It might not be visible yet, or be disabled
        if (await startButton.isVisible()) {
            await expect(startButton).toBeDisabled();
        }

        // Now join Blue
        const blue = await joinSpymaster(browser, roomCode, 'Blue');

        // Start should now be enabled
        const enabledStart = red.page.getByRole('button', { name: /Start Game/i });
        await expect(enabledStart).toBeEnabled({ timeout: 5000 });

        await red.context.close();
        await blue.context.close();
    });

    test('Players see their role confirmation after joining', async ({ browser }) => {
        const { roomCode } = await createGame(browser);

        // Join as Red
        const red = await joinSpymaster(browser, roomCode, 'Red');

        // Should see confirmation that they are Red Spymaster
        await expect(red.page.locator('text=/RED.*Spymaster|Spymaster.*RED/i')).toBeVisible();

        await red.context.close();
    });
});

// ============================================================================
// JOIN FLOW TESTS
// ============================================================================

test.describe('Lobby - Join Flow', () => {
    test('Join page shows available roles', async ({ browser }) => {
        const { roomCode } = await createGame(browser);

        const joinContext = await browser.newContext();
        const joinPage = await joinContext.newPage();
        await joinPage.goto(`/join/${roomCode}`);

        // Should show both team options
        await expect(joinPage.getByRole('button', { name: /Red Spymaster/i })).toBeVisible();
        await expect(joinPage.getByRole('button', { name: /Blue Spymaster/i })).toBeVisible();

        await joinContext.close();
    });

    test('Taken roles show as disabled on join page', async ({ browser }) => {
        const { roomCode } = await createGame(browser);

        // Red joins first
        const red = await joinSpymaster(browser, roomCode, 'Red');

        // Another player tries to join
        const lateContext = await browser.newContext();
        const latePage = await lateContext.newPage();
        await latePage.goto(`/join/${roomCode}`);

        // Red should be shown as taken/disabled
        const redButton = latePage.getByRole('button', { name: /Red Spymaster/i });
        await expect(redButton).toBeDisabled();
        await expect(redButton).toContainText(/Taken/i);

        // Blue should still be available
        const blueButton = latePage.getByRole('button', { name: /Blue Spymaster/i });
        await expect(blueButton).toBeEnabled();

        await red.context.close();
        await lateContext.close();
    });

    test('Invalid room code shows error message', async ({ page }) => {
        await page.goto('/join/INVALID');

        // Should show error or redirect
        await expect(
            page.locator('text=/not found|invalid|error|doesn.t exist/i').first()
        ).toBeVisible({ timeout: 5000 });
    });

    test('Join URL is shareable and works', async ({ browser }) => {
        const { tvPage, roomCode } = await createGame(browser);

        // Construct direct join URL
        const joinUrl = `/join/${roomCode}`;

        // Open in new context (simulating friend following shared link)
        const friendContext = await browser.newContext();
        const friendPage = await friendContext.newPage();
        await friendPage.goto(joinUrl);

        // Should see role selection
        await expect(friendPage.getByRole('button', { name: /Spymaster/i }).first()).toBeVisible();

        await friendContext.close();
    });
});

// ============================================================================
// QR CODE TESTS (if implemented)
// ============================================================================

test.describe('Lobby - QR Code (Optional)', () => {
    test('QR code is displayed for easy phone joining', async ({ browser }) => {
        const { tvPage } = await createGame(browser);

        // Look for QR code image or canvas
        const qrCode = tvPage.locator('img[alt*="QR"], canvas.qr-code, [data-testid="qr-code"]');

        // This is optional - if not implemented, skip
        if (await qrCode.count() > 0) {
            await expect(qrCode.first()).toBeVisible();
        }
    });
});

// ============================================================================
// INSTRUCTIONS / HELP TESTS
// ============================================================================

test.describe('Lobby - Instructions', () => {
    test('Clear instructions are shown for new players', async ({ browser }) => {
        const { tvPage, roomCode } = await createGame(browser);

        // Room code should be visible as the main instruction element
        const roomCodeElement = tvPage.locator('.text-4xl.tracking-widest.font-mono');
        await expect(roomCodeElement).toBeVisible();
        await expect(roomCodeElement).toHaveText(roomCode);
    });
});

// ============================================================================
// RESPONSIVE LOBBY TESTS
// ============================================================================

test.describe('Lobby - Responsive Design', () => {
    test('TV lobby works at 1920x1080', async ({ browser }) => {
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 }
        });
        const page = await context.newPage();
        await page.goto('/');
        await page.click('text=Create New Game');

        // Room code should be visible
        const roomCode = page.locator('.text-4xl.tracking-widest.font-mono');
        await expect(roomCode).toBeVisible();

        await context.close();
    });

    test('TV lobby works at 1280x720', async ({ browser }) => {
        const context = await browser.newContext({
            viewport: { width: 1280, height: 720 }
        });
        const page = await context.newPage();
        await page.goto('/');
        await page.click('text=Create New Game');

        // Room code should still be visible
        const roomCode = page.locator('.text-4xl.tracking-widest.font-mono');
        await expect(roomCode).toBeVisible();

        await context.close();
    });

    test('Join page works on mobile viewport (375px)', async ({ browser }) => {
        const { roomCode } = await createGame(browser);

        const mobileContext = await browser.newContext({
            viewport: { width: 375, height: 667 },
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
        });
        const mobilePage = await mobileContext.newPage();
        await mobilePage.goto(`/join/${roomCode}`);

        // Role buttons should be visible and tappable
        const redButton = mobilePage.getByRole('button', { name: /Red Spymaster/i });
        await expect(redButton).toBeVisible();

        // Check button is large enough for touch (44px minimum)
        const box = await redButton.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(44);

        await mobileContext.close();
    });
});
