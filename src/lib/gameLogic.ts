
export function validateClue(clue: string, boardWords: string[]): { valid: boolean; reason?: string } {
    const normalizedClue = clue.trim().toUpperCase();

    if (!normalizedClue) {
        return { valid: false, reason: "Clue cannot be empty" };
    }

    // check for spaces
    if (normalizedClue.includes(' ')) {
        return { valid: false, reason: "Clue must be a single word" };
    }

    // check if clue is contained in any board word or vice versa
    // We only check unrevealed words usually, but standard rules say ANY word on board?
    // "You can't say any part of a word on the table". This usually implies active words.
    // But let's check strict rules: "You can't use any part of a word on the board".
    // Simplest strict implementation: Check all board words.

    for (const word of boardWords) {
        const normalizedBoardWord = word.toUpperCase();
        if (normalizedClue.includes(normalizedBoardWord) || normalizedBoardWord.includes(normalizedClue)) {
            return { valid: false, reason: `Clue matches board word: ${word}` };
        }
    }

    return { valid: true };
}
