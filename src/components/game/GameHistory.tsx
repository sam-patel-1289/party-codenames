import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameLog } from '@/types/game';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface GameHistoryProps {
    roomId: string;
    className?: string;
}

// We can just rely on the logs passed down from the parent or listen to global room state? 
// Actually, in our new socket architecture, the `room` object has `logs` array in it!
// But `useGameRoom.ts` doesn't expose `logs` yet? 
// Wait, `room` state in `useGameRoom` is the FULL room object from server. 
// So we can just receive `logs` as a prop if we update `GameHistoryProps` OR 
// we can use a simpler approach: have this component listen to the same socket updates 
// OR have it receive the logs array from the parent TVView.

// Let's refactor this component to take `logs` as a prop directly, making it a "dumb" component.
// This is much cleaner than duplicated socket logic.
// HOWEVER, I need to update the parent (TVView) to pass logs.

// Let's assume I will update TVView next.

export function GameHistory({ logs = [], className }: { logs?: GameLog[], className?: string }) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll when logs change
    useEffect(() => {
        if (scrollRef.current) {
            const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollElement) {
                scrollElement.scrollTop = scrollElement.scrollHeight;
            }
        }
    }, [logs]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollElement) {
                scrollElement.scrollTop = scrollElement.scrollHeight;
            }
        }
    }, [logs]);

    return (
        <div className={cn("bg-card border rounded-lg overflow-hidden flex flex-col h-full", className)}>
            <div className="p-3 border-b bg-muted/30">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Game History</h3>
            </div>
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                    {logs.map((log) => (
                        <div key={log.id} className="text-sm">
                            {log.event_type === 'clue' && (
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "font-bold px-2 py-0.5 rounded text-xs uppercase",
                                        log.team === 'red' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                                    )}>
                                        {log.team}
                                    </span>
                                    <span>gave clue:</span>
                                    <span className="font-bold font-mono text-base">
                                        {log.clue_word} ({log.clue_number})
                                    </span>
                                </div>
                            )}

                            {log.event_type === 'selection' && (
                                <div className="flex items-center gap-2 ml-4 text-muted-foreground">
                                    <span>↳</span>
                                    <span>selected</span>
                                    <span className="font-medium text-foreground">{log.selected_word}</span>
                                    {log.selected_card_type && (
                                        <span className={cn(
                                            "text-xs px-1.5 py-0.5 rounded-full uppercase",
                                            log.selected_card_type === 'red' && "bg-red-500 text-white",
                                            log.selected_card_type === 'blue' && "bg-blue-500 text-white",
                                            log.selected_card_type === 'assassin' && "bg-black text-white",
                                            log.selected_card_type === 'bystander' && "bg-gray-200 text-gray-700"
                                        )}>
                                            {log.selected_card_type}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {logs.length === 0 && (
                        <div className="text-muted-foreground italic text-center py-4">
                            Game started. Waiting for first clue...
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
