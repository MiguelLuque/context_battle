'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface GuessEntry {
    id: string;
    word?: string;
    score: number;
    timestamp: number;
    player_id: string;
}

export default function Game() {
    const [inputValue, setInputValue] = useState('');
    const [playerGuesses, setPlayerGuesses] = useState<GuessEntry[]>([]);
    const [opponentGuesses, setOpponentGuesses] = useState<GuessEntry[]>([]);
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [channel, setChannel] = useState<any>(null);


    useEffect(() => {
        // Generar un ID de jugador aleatorio para esta sesión (para demo)
        setPlayerId(Math.random().toString(36).substring(7));
    }, []);

    function handleBroadcastGuess(newGuess: GuessEntry) {
        if (newGuess.player_id === playerId) {
            //setPlayerGuesses((prev) => [newGuess, ...prev]);
        } else {
            setOpponentGuesses((prev) => [newGuess, ...prev].sort((a, b) => a.score - b.score));
        }
    };

    useEffect(() => {
        if (!playerId) return;

        // Crear el canal de broadcast
        const gameChannel = supabase.channel('game_channel');

        gameChannel
            .on('broadcast', { event: 'new_guess' }, (payload) => {
                handleBroadcastGuess(payload.payload.guess)
            })

            .subscribe((status) => {
                console.log(`El estatus es ${status}`)
                if (status === 'SUBSCRIBED') {
                    console.log(`Seteamos el channel`)
                    setChannel(gameChannel);
                }
            });

        
        // Desuscribirse cuando el componente se desmonta
        return () => {
            console.log("Quitamos la subscription")
            supabase.removeChannel(gameChannel);
        };
    }, [playerId]);

    const getScoreColor = (score: number) => {
        if (score <= 150) return 'bg-emerald-500';
        if (score <= 1000) return 'bg-green-500';
        if (score <= 5000) return 'bg-yellow-500';
        if (score <= 15000) return 'bg-orange-500';
        return 'bg-red-500';
    };

    const getScoreWidth = (score: number) => {
        const percentage = 100 - score / 300;
        return `${Math.max(percentage, 5)}%`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || !playerId || !channel) return;

        const mockScore = Math.floor(Math.random() * 30000);

        const newGuess: GuessEntry = {
            id: Math.random().toString(36).substring(7),
            word: inputValue,
            score: mockScore,
            timestamp: Date.now(),
            player_id: playerId,
        };

        // Enviar el intento al canal sin guardarlo en la base de datos
        await channel.send({
            type: 'broadcast',
            event: 'new_guess',
            payload: { guess: newGuess },
        });

        // Agregar el nuevo intento a la lista de intentos del jugador
        setPlayerGuesses((prev) => [newGuess, ...prev].sort((a, b) => a.score - b.score));
        setInputValue('');
    };



    const renderGuessEntry = (guess: GuessEntry, isLastGuess: boolean = false, showWord: boolean = true) => (
        <div
            key={guess.id}
            className={cn(
                "relative h-12 bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-300",
                isLastGuess && "ring-2 ring-blue-500"
            )}
        >
            <div
                className={cn(
                    "absolute inset-0 opacity-20 transition-all",
                    getScoreColor(guess.score)
                )}
                style={{ width: getScoreWidth(guess.score) }}
            />
            <div className="relative h-full flex items-center justify-between px-4">
                {showWord && <span className="font-medium">{guess.word}</span>}
                <span className={cn(
                    "font-mono",
                    guess.score <= 150 ? "text-emerald-600 font-bold" : "text-gray-600"
                )}>
                    {guess.score}
                </span>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">CONTEXTO</h1>
                    <div className="text-lg text-muted-foreground">
                        GAME: #775 · GUESSES: {playerGuesses.length} · HINTS: 2
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        type="text"
                        placeholder="type a word"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="w-full h-14 text-xl text-center rounded-xl"
                    />
                </form>

                <div className="grid grid-cols-2 gap-8">
                    {/* Player's guesses */}
                    <div className="space-y-3">
                        <h2 className="text-xl font-semibold mb-4">Your Guesses</h2>
                        {playerGuesses.length > 0 ? (
                            <>
                                <h3 className="text-lg font-medium mb-2">Last Guess</h3>
                                {renderGuessEntry(playerGuesses[0], true)}
                                <h3 className="text-lg font-medium my-2">All Guesses</h3>
                                {playerGuesses.map((guess) => renderGuessEntry(guess))}
                            </>
                        ) : (
                            <p className="text-muted-foreground">No guesses yet. Start typing to play!</p>
                        )}
                    </div>

                    {/* Opponent's guesses */}
                    <div className="space-y-3">
                        <h2 className="text-xl font-semibold mb-4">Opponent's Progress</h2>
                        {opponentGuesses.length > 0 ? (
                            <>
                                <h3 className="text-lg font-medium mb-2">Last Guess</h3>
                                {renderGuessEntry(opponentGuesses[0], true, false)}
                                <h3 className="text-lg font-medium my-2">All Guesses</h3>
                                {opponentGuesses.map((guess) => renderGuessEntry(guess, false, false))}
                            </>
                        ) : (
                            <p className="text-muted-foreground">Waiting for opponent's first guess...</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
