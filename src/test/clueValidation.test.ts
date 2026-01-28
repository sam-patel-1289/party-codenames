import { describe, it, expect } from 'vitest';
import { validateClue } from '../lib/gameLogic';

describe('validateClue', () => {
    const boardWords = ['APPLE', 'BANANA', 'CHERRY', 'DOG', 'ELEPHANT'];

    it('allows valid clues', () => {
        expect(validateClue('FRUIT', boardWords)).toEqual({ valid: true });
        expect(validateClue('ANIMAL', boardWords)).toEqual({ valid: true });
    });

    it('rejects empty clues', () => {
        expect(validateClue('', boardWords)).toEqual({ valid: false, reason: 'Clue cannot be empty' });
        expect(validateClue('   ', boardWords)).toEqual({ valid: false, reason: 'Clue cannot be empty' });
    });

    it('rejects multi-word clues', () => {
        expect(validateClue('RED FRUIT', boardWords)).toEqual({ valid: false, reason: 'Clue must be a single word' });
    });

    it('rejects clues that are board words', () => {
        expect(validateClue('APPLE', boardWords)).toEqual({ valid: false, reason: 'Clue matches board word: APPLE' });
        expect(validateClue('apple', boardWords)).toEqual({ valid: false, reason: 'Clue matches board word: APPLE' });
    });

    it('rejects clues that contain board words', () => {
        expect(validateClue('APPLEPIE', boardWords)).toEqual({ valid: false, reason: 'Clue matches board word: APPLE' });
        expect(validateClue('bigdog', boardWords)).toEqual({ valid: false, reason: 'Clue matches board word: DOG' });
    });

    it('rejects clues contained in board words', () => {
        expect(validateClue('LOG', ['LOGGER'],)).toEqual({ valid: false, reason: 'Clue matches board word: LOGGER' });
    });
});
