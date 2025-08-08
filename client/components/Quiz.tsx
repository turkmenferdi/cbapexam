import { useState, useEffect, useCallback } from 'react';

interface Question {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

interface QuizConfig {
  total_questions: number;
  chunk_size: number;
  num_chunks: number;
  files: string[];
}

interface FeedbackState {
  show: boolean;
  isCorrect: boolean;
  correctAnswer?: string;
  correctOption?: string;
}

export function Quiz() {
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [questionOrder, setQuestionOrder] = useState<number[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [currentChunkId, setCurrentChunkId] = useState<number | null>(null);
  const [currentChunkData, setCurrentChunkData] = useState<Question[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>({ show: false, isCorrect: false });
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Shuffle function to randomize array order
  const shuffle = (array: number[]): number[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Robust data loading using XMLHttpRequest to bypass fetch interceptors
  const loadJsonData = async (url: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Cache-Control', 'no-store');

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch (parseError) {
              reject(new Error(`JSON parsing failed: ${parseError}`));
            }
          } else {
            reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send();
    });
  };

  // Load quiz configuration
  const loadConfig = async () => {
    try {
      setLoading(true);
      console.log('Loading quiz configuration...');

      const configData: QuizConfig = await loadJsonData('/data/questions_index.json');
      console.log('Quiz configuration loaded:', configData);
      setConfig(configData);

      // Create and shuffle question order
      const order = Array.from({ length: configData.total_questions }, (_, i) => i);
      setQuestionOrder(shuffle(order));
    } catch (error) {
      console.error('Failed to load quiz configuration:', error);
      // Set error state to show user-friendly message
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  // Load a specific chunk
  const loadChunk = async (chunkIndex: number): Promise<Question[]> => {
    try {
      console.log(`Loading chunk ${chunkIndex}: ${config!.files[chunkIndex]}`);

      const chunkData = await loadJsonData(`/data/${config!.files[chunkIndex]}`);
      console.log(`Chunk ${chunkIndex} loaded with ${chunkData.length} questions`);
      return chunkData;
    } catch (error) {
      console.error(`Failed to load chunk ${chunkIndex}:`, error);
      return [];
    }
  };

  // Get chunk ID for a given question index
  const getChunkId = (questionIndex: number): number => {
    return Math.floor(questionIndex / config!.chunk_size);
  };

  // Get current question
  const getCurrentQuestion = useCallback(async (): Promise<Question | null> => {
    if (!config || currentIdx >= questionOrder.length) return null;

    const questionIndex = questionOrder[currentIdx];
    const requiredChunkId = getChunkId(questionIndex);

    // Load chunk if not already loaded
    if (currentChunkId !== requiredChunkId) {
      setLoading(true);
      const chunkData = await loadChunk(requiredChunkId);
      setCurrentChunkData(chunkData);
      setCurrentChunkId(requiredChunkId);
      setLoading(false);
    }

    const localIndex = questionIndex % config.chunk_size;
    return currentChunkData[localIndex] || null;
  }, [config, currentIdx, questionOrder, currentChunkId, currentChunkData]);

  // Start the quiz
  const startQuiz = () => {
    setQuizStarted(true);
    setCurrentIdx(0);
    setScore(0);
    setWrong(0);
    setQuizCompleted(false);
    setFeedback({ show: false, isCorrect: false });
  };

  // Handle answer selection
  const handleAnswer = (selectedOption: string) => {
    if (feedback.show) return; // Prevent multiple selections

    getCurrentQuestion().then(question => {
      if (!question) return;

      const isCorrect = selectedOption === question.answer;
      const correctOption = question.options.find(opt => opt.startsWith(question.answer));

      setFeedback({
        show: true,
        isCorrect,
        correctAnswer: question.answer,
        correctOption
      });

      if (isCorrect) {
        setScore(prev => prev + 1);
      } else {
        setWrong(prev => prev + 1);
      }
    });
  };

  // Skip question
  const skipQuestion = () => {
    if (feedback.show) return;
    setWrong(prev => prev + 1);
    nextQuestion();
  };

  // Finish quiz early
  const finishQuiz = () => {
    if (feedback.show) return;
    setQuizCompleted(true);
  };

  // Move to next question
  const nextQuestion = () => {
    setFeedback({ show: false, isCorrect: false });

    if (currentIdx >= questionOrder.length - 1) {
      setQuizCompleted(true);
    } else {
      setCurrentIdx(prev => prev + 1);
    }
  };

  // Navigate to specific question
  const goToQuestion = (questionIndex: number) => {
    if (questionIndex >= 0 && questionIndex < questionOrder.length) {
      setCurrentIdx(questionIndex);
      setFeedback({ show: false, isCorrect: false });
    }
  };

  // Go to previous question
  const previousQuestion = () => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
      setFeedback({ show: false, isCorrect: false });
    }
  };

  // Restart quiz
  const restartQuiz = () => {
    const order = Array.from({ length: config!.total_questions }, (_, i) => i);
    setQuestionOrder(shuffle(order));
    setCurrentIdx(0);
    setScore(0);
    setWrong(0);
    setQuizCompleted(false);
    setQuizStarted(false);
    setFeedback({ show: false, isCorrect: false });
    setCurrentChunkId(null);
    setCurrentChunkData([]);
  };

  // Load config on component mount
  useEffect(() => {
    loadConfig();
  }, []);

  // Pre-load question when currentIdx changes
  useEffect(() => {
    if (quizStarted && !quizCompleted) {
      getCurrentQuestion();
    }
  }, [getCurrentQuestion, quizStarted, quizCompleted]);

  if (loading && !config) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">Failed to load quiz configuration</p>
        </div>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Business Analysis Quiz</h1>
          <p className="text-gray-600 mb-8">Test your business analysis knowledge with {config.total_questions} professional questions!</p>
          <button
            onClick={startQuiz}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 w-full"
          >
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    const percentage = Math.round((score / config.total_questions) * 100);
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Quiz Complete!</h2>
          <div className="mb-6">
            <div className="text-6xl font-bold text-indigo-600 mb-2">{percentage}%</div>
            <p className="text-gray-600">Total Score</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{score}</div>
              <p className="text-green-700 text-sm">Correct</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">{wrong}</div>
              <p className="text-red-700 text-sm">Incorrect</p>
            </div>
          </div>
          <button
            onClick={restartQuiz}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 w-full"
          >
            Restart Quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <QuizQuestion
      config={config}
      currentIdx={currentIdx}
      questionOrder={questionOrder}
      score={score}
      feedback={feedback}
      loading={loading}
      onAnswer={handleAnswer}
      onSkip={skipQuestion}
      onFinish={finishQuiz}
      getCurrentQuestion={getCurrentQuestion}
      setFeedback={setFeedback}
      setCurrentIdx={setCurrentIdx}
      setQuizCompleted={setQuizCompleted}
      goToQuestion={goToQuestion}
      previousQuestion={previousQuestion}
      nextQuestion={nextQuestion}
    />
  );
}

interface QuizQuestionProps {
  config: QuizConfig;
  currentIdx: number;
  questionOrder: number[];
  score: number;
  feedback: FeedbackState;
  loading: boolean;
  onAnswer: (option: string) => void;
  onSkip: () => void;
  onFinish: () => void;
  getCurrentQuestion: () => Promise<Question | null>;
  setFeedback: (feedback: FeedbackState) => void;
  setCurrentIdx: (idx: number | ((prev: number) => number)) => void;
  setQuizCompleted: (completed: boolean) => void;
  goToQuestion: (questionIndex: number) => void;
  previousQuestion: () => void;
  nextQuestion: () => void;
}

function QuizQuestion({
  config,
  currentIdx,
  questionOrder,
  score,
  feedback,
  loading,
  onAnswer,
  onSkip,
  onFinish,
  getCurrentQuestion,
  setFeedback,
  setCurrentIdx,
  setQuizCompleted,
  goToQuestion,
  previousQuestion,
  nextQuestion
}: QuizQuestionProps) {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  useEffect(() => {
    getCurrentQuestion().then(setCurrentQuestion);
  }, [getCurrentQuestion]);

  if (loading || !currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-8"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-4xl w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-gray-500">
            Question {currentIdx + 1} of {config.total_questions}
          </div>
          <div className="text-sm font-semibold text-indigo-600">
            Score: {score}
          </div>
        </div>

        {/* Question Navigation */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Soru Navigasyonu</h3>
            <div className="flex gap-2">
              <button
                onClick={previousQuestion}
                disabled={currentIdx === 0}
                className="px-3 py-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white text-sm rounded transition-colors duration-200"
              >
                ← Önceki
              </button>
              <button
                onClick={nextQuestion}
                disabled={currentIdx >= config.total_questions - 1}
                className="px-3 py-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white text-sm rounded transition-colors duration-200"
              >
                Sonraki →
              </button>
            </div>
          </div>

          {/* Question Numbers Grid */}
          <div className="grid grid-cols-10 gap-2 max-h-32 overflow-y-auto">
            {Array.from({ length: config.total_questions }, (_, i) => (
              <button
                key={i}
                onClick={() => goToQuestion(i)}
                className={`w-8 h-8 text-sm font-medium rounded transition-all duration-200 ${
                  i === currentIdx
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 hover:bg-indigo-100 text-gray-700'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIdx + 1) / config.total_questions) * 100}%` }}
          ></div>
        </div>

        {/* Question */}
        <h2 className="text-2xl font-bold text-gray-800 mb-8 leading-relaxed">
          {currentQuestion.question}
        </h2>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {currentQuestion.options.map((option, index) => {
            const optionLetter = option.charAt(0);
            return (
              <button
                key={index}
                onClick={() => onAnswer(optionLetter)}
                disabled={feedback.show}
                className="w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="font-medium">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {feedback.show && (
          <div className={`p-4 rounded-lg mb-6 ${
            feedback.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className={`font-semibold mb-2 ${
              feedback.isCorrect ? 'text-green-700' : 'text-red-700'
            }`}>
              {feedback.isCorrect ? 'Correct ✅' : `Wrong ❌ Correct: ${feedback.correctAnswer} - ${feedback.correctOption}`}
            </div>
            {currentQuestion.explanation && (
              <p className="text-gray-600 text-sm">{currentQuestion.explanation}</p>
            )}
          </div>
        )}

        {/* Action buttons */}
        {!feedback.show ? (
          <div className="flex gap-3">
            <button
              onClick={onSkip}
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
            >
              Skip
            </button>
            <button
              onClick={onFinish}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
            >
              Bitir
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => {
                setFeedback({ show: false, isCorrect: false });
                if (currentIdx >= questionOrder.length - 1) {
                  setQuizCompleted(true);
                } else {
                  setCurrentIdx(prev => prev + 1);
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
            >
              Sonraki Soru
            </button>
            <button
              onClick={onFinish}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
            >
              Bitir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
