import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameStatus } from '../components/game/GameStatus';
import { GameRoom } from '../types/game';

// Helper to create a mock room
function createMockRoom(overrides: Partial<GameRoom> = {}): GameRoom {
    return {
        id: 'test-room-id',
        room_code: 'TESTCODE',
        game_state: 'playing',
        current_turn: 'red',
        starting_team: 'red',
        current_clue_word: null,
        current_clue_number: null,
        clue_status: 'allowed',
        strict_clue_rules: true,
        clue_penalty_enabled: false,
        guesses_remaining: 0,
        guesses_used: 0,
        red_score: 0,
        blue_score: 0,
        red_target: 8,
        blue_target: 9,
        winner: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        logs: [],
        ...overrides
    };
}

describe('GameStatus', () => {
    describe('Clue Display', () => {
        it('displays clue word and number in red team color when red team turn', () => {
            const room = createMockRoom({
                current_turn: 'red',
                current_clue_word: 'OCEAN',
                current_clue_number: 3,
                guesses_remaining: 4,
                guesses_used: 0
            });

            render(<GameStatus room={room} isTV />);

            const clueElement = screen.getByText('OCEAN');
            // The clue text should have red color class
            expect(clueElement.closest('div')).toHaveClass('text-red-500');
        });

        it('displays clue word and number in blue team color when blue team turn', () => {
            const room = createMockRoom({
                current_turn: 'blue',
                current_clue_word: 'MOUNTAIN',
                current_clue_number: 2,
                guesses_remaining: 3,
                guesses_used: 0
            });

            render(<GameStatus room={room} isTV />);

            const clueElement = screen.getByText('MOUNTAIN');
            expect(clueElement.closest('div')).toHaveClass('text-blue-500');
        });

        it('displays clue number with same color as clue word', () => {
            const room = createMockRoom({
                current_turn: 'red',
                current_clue_word: 'TEST',
                current_clue_number: 5,
                guesses_remaining: 6,
                guesses_used: 0
            });

            render(<GameStatus room={room} isTV />);

            // Number should be in same container with red color
            const numberElement = screen.getByText('5');
            expect(numberElement.closest('div')).toHaveClass('text-red-500');
        });
    });

    describe('Score Display', () => {
        it('displays remaining words to guess, not scored/target', () => {
            const room = createMockRoom({
                red_score: 2,
                blue_score: 3,
                red_target: 8,
                blue_target: 9
            });

            render(<GameStatus room={room} isTV />);

            // Should show remaining: 8-2=6 for red, 9-3=6 for blue
            // Since both are 6, we expect to find 2 elements
            const scores = screen.getAllByText('6');
            expect(scores).toHaveLength(2);
        });

        it('shows correct remaining count when teams have different progress', () => {
            const room = createMockRoom({
                red_score: 5,
                blue_score: 1,
                red_target: 8,
                blue_target: 9
            });

            render(<GameStatus room={room} isTV />);

            // Red remaining: 8-5=3, Blue remaining: 9-1=8
            expect(screen.getByText('3')).toBeInTheDocument();
            expect(screen.getByText('8')).toBeInTheDocument();
        });

        it('shows team labels below the numbers', () => {
            const room = createMockRoom();

            render(<GameStatus room={room} isTV />);

            expect(screen.getByText('Red')).toBeInTheDocument();
            expect(screen.getByText('Blue')).toBeInTheDocument();
        });
    });
});
