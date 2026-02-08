import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, RotateCcw, ArrowRight, CheckCircle2, XCircle, Loader2, Home, Star } from "lucide-react";
import { Link } from "wouter";

interface QuizQuestion {
  id: number;
  arabic: string;
  options: string[];
  correctIndex: number;
}

const TOTAL_QUESTIONS = 10;

export default function QuizPage() {
  const queryClient = useQueryClient();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');
  const [bestScore, setBestScore] = useState<number>(() => {
    const saved = localStorage.getItem('quiz-best-score');
    return saved ? parseInt(saved) : 0;
  });

  const { data: question, isLoading, refetch } = useQuery<QuizQuestion>({
    queryKey: ['quiz-question', currentQuestion],
    queryFn: async () => {
      const res = await fetch('/api/quiz/question');
      if (!res.ok) throw new Error('Failed to fetch question');
      return res.json();
    },
    staleTime: 0,
    gcTime: 0,
  });

  const handleAnswer = (index: number) => {
    if (isAnswered) return;
    setSelectedAnswer(index);
    setIsAnswered(true);
    if (index === question?.correctIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion + 1 >= TOTAL_QUESTIONS) {
      if (score > bestScore) {
        setBestScore(score);
        localStorage.setItem('quiz-best-score', score.toString());
      }
      setGameState('finished');
    } else {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setGameState('playing');
    queryClient.invalidateQueries({ queryKey: ['quiz-question'] });
  };

  const getScoreMessage = () => {
    const percentage = (score / TOTAL_QUESTIONS) * 100;
    if (percentage === 100) return "Mukammal! Siz haqiqiy bilimdon!";
    if (percentage >= 80) return "Ajoyib natija! Juda yaxshi bilasiz!";
    if (percentage >= 60) return "Yaxshi! Biroz mashq qilsangiz zo'r bo'ladi!";
    if (percentage >= 40) return "Yomonmas! Davom eting!";
    return "Mashq qiling, natija yaxshilanadi!";
  };

  const getScoreEmoji = () => {
    const percentage = (score / TOTAL_QUESTIONS) * 100;
    if (percentage === 100) return "🏆";
    if (percentage >= 80) return "⭐";
    if (percentage >= 60) return "👍";
    if (percentage >= 40) return "💪";
    return "📚";
  };

  if (gameState === 'finished') {
    return (
      <Layout>
        <div className="min-h-[80vh] flex items-center justify-center px-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-md w-full"
          >
            <div className="bg-card rounded-2xl border-2 border-primary/20 shadow-xl p-8 text-center">
              <div className="text-6xl mb-4">{getScoreEmoji()}</div>
              <h2 className="text-2xl font-bold text-foreground mb-2">O'yin tugadi!</h2>
              <p className="text-muted-foreground mb-6">{getScoreMessage()}</p>
              
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 mb-6">
                <div className="text-5xl font-bold text-primary mb-1">
                  {score}/{TOTAL_QUESTIONS}
                </div>
                <p className="text-sm text-muted-foreground">to'g'ri javob</p>
              </div>

              {score >= bestScore && score > 0 && (
                <div className="flex items-center justify-center gap-2 text-amber-600 mb-4">
                  <Star className="h-5 w-5 fill-amber-500" />
                  <span className="font-medium">Yangi rekord!</span>
                </div>
              )}

              <div className="text-sm text-muted-foreground mb-6">
                Eng yaxshi natija: <span className="font-bold text-foreground">{bestScore}/{TOTAL_QUESTIONS}</span>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleRestart}
                  className="flex-1 bg-primary hover:bg-primary/90"
                  data-testid="btn-restart-quiz"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Qayta o'ynash
                </Button>
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full" data-testid="btn-go-home">
                    <Home className="h-4 w-4 mr-2" />
                    Bosh sahifa
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
        <div className="max-w-lg w-full">
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">
                Savol {currentQuestion + 1}/{TOTAL_QUESTIONS}
              </span>
              <span className="text-sm font-medium text-primary flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                {score} ball
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <motion.div
                className="bg-primary h-2.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentQuestion + 1) / TOTAL_QUESTIONS) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Question card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-card rounded-2xl border-2 border-border shadow-lg overflow-hidden">
                {/* Arabic word */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-center">
                  {isLoading ? (
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-white" />
                  ) : (
                    <h2
                      className="font-arabic text-4xl md:text-5xl text-white font-bold"
                      dir="rtl"
                      data-testid="quiz-arabic-word"
                    >
                      {question?.arabic}
                    </h2>
                  )}
                  <p className="text-emerald-100 text-sm mt-3">Bu so'zning tarjimasini toping</p>
                </div>

                {/* Options */}
                <div className="p-6 space-y-3">
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />
                      ))}
                    </div>
                  ) : (
                    question?.options.map((option, index) => {
                      let buttonStyle = "bg-muted/50 hover:bg-muted border-2 border-transparent hover:border-primary/30";
                      
                      if (isAnswered) {
                        if (index === question.correctIndex) {
                          buttonStyle = "bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-500 text-emerald-700 dark:text-emerald-400";
                        } else if (index === selectedAnswer && index !== question.correctIndex) {
                          buttonStyle = "bg-red-50 dark:bg-red-950/30 border-2 border-red-500 text-red-700 dark:text-red-400";
                        } else {
                          buttonStyle = "bg-muted/30 border-2 border-transparent opacity-50";
                        }
                      }

                      return (
                        <motion.button
                          key={index}
                          onClick={() => handleAnswer(index)}
                          disabled={isAnswered}
                          className={`w-full p-4 rounded-xl text-left transition-all ${buttonStyle} flex items-center justify-between`}
                          whileHover={!isAnswered ? { scale: 1.02 } : {}}
                          whileTap={!isAnswered ? { scale: 0.98 } : {}}
                          data-testid={`quiz-option-${index}`}
                        >
                          <span className="font-medium text-base">{option}</span>
                          {isAnswered && index === question.correctIndex && (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                          )}
                          {isAnswered && index === selectedAnswer && index !== question.correctIndex && (
                            <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                          )}
                        </motion.button>
                      );
                    })
                  )}
                </div>

                {/* Next button */}
                {isAnswered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-6 pb-6"
                  >
                    <Button
                      onClick={handleNext}
                      className="w-full py-6 text-lg bg-primary hover:bg-primary/90"
                      data-testid="btn-next-question"
                    >
                      {currentQuestion + 1 >= TOTAL_QUESTIONS ? (
                        <>
                          <Trophy className="h-5 w-5 mr-2" />
                          Natijani ko'rish
                        </>
                      ) : (
                        <>
                          Keyingi savol
                          <ArrowRight className="h-5 w-5 ml-2" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Best score */}
          {bestScore > 0 && (
            <div className="text-center mt-4 text-sm text-muted-foreground">
              Eng yaxshi natija: <span className="font-bold">{bestScore}/{TOTAL_QUESTIONS}</span>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
