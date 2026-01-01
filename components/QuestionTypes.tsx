// =============================================================================
// QUESTION TYPE COMPONENTS
// =============================================================================
// 
// This file contains all the interactive question components for Quantara's
// gamified learning experience. Each question type provides immediate feedback
// and is designed to be engaging like Duolingo.
//
// QUESTION TYPES:
// 1. MCQQuestion - Multiple choice (tap to select)
// 2. TrueFalseQuestion - Binary choice
// 3. FillBlankQuestion - Type the answer
// 4. MatchingQuestion - Connect items
// 5. OrderingQuestion - Drag to reorder
// 6. ScenarioQuestion - Decision-based scenarios
// 7. CalculationQuestion - Math problems
//
// =============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  Pressable, 
  TextInput,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import Spacer from './Spacer';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import {
  MCQQuestion as MCQType,
  TrueFalseQuestion as TFType,
  FillBlankQuestion as FillType,
  MatchingQuestion as MatchType,
  OrderingQuestion as OrderType,
  ScenarioQuestion as ScenarioType,
  CalculationQuestion as CalcType,
  Question,
} from '../types';

// =============================================================================
// COMMON TYPES & PROPS
// =============================================================================

// Result of answering a question
export interface QuestionResult {
  isCorrect: boolean;
  selectedAnswer: string | number | number[] | string[];
  correctAnswer: string | number | number[] | string[];
  xpEarned: number;
}

// Common props all question components receive
export interface QuestionProps<T extends Question> {
  question: T;                              // The question data
  onAnswer: (result: QuestionResult) => void;  // Called when user submits answer
  disabled?: boolean;                       // Prevent interaction after answering
  showResult?: boolean;                     // Show correct/incorrect state
  isCorrect?: boolean;                      // Result to show (if showResult is true)
}

// =============================================================================
// ANIMATED OPTION BUTTON
// =============================================================================

// Reusable animated button for options
interface OptionButtonProps {
  text: string;
  onPress: () => void;
  selected: boolean;
  disabled: boolean;
  correct?: boolean;  // undefined = not showing result, true/false = showing result
  index: number;
}

function OptionButton({ text, onPress, selected, disabled, correct, index }: OptionButtonProps) {
  const { theme } = useTheme();
  
  // Animation values
  const scale = useSharedValue(1);
  const shake = useSharedValue(0);

  // Determine background color based on state
  const backgroundColor = useMemo(() => {
    if (correct === true) return '#22C55E';     // Green for correct
    if (correct === false && selected) return '#EF4444';  // Red for wrong selection
    if (selected) return theme.primary;          // Primary when selected
    return theme.card;                           // Default card background
  }, [correct, selected, theme]);

  // Determine text color
  const textColor = useMemo(() => {
    if (correct !== undefined && selected) return '#FFFFFF';
    if (selected) return '#FFFFFF';
    return theme.text;
  }, [correct, selected, theme]);

  // Determine border color
  const borderColor = useMemo(() => {
    if (correct === true) return '#22C55E';
    if (correct === false && selected) return '#EF4444';
    if (selected) return theme.primary;
    return theme.border;
  }, [correct, selected, theme]);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: shake.value },
    ],
  }));

  // Handle press with animation
  const handlePress = useCallback(() => {
    if (disabled) return;
    
    // Quick scale animation
    scale.value = withSequence(
      withTiming(0.95, { duration: 50 }),
      withSpring(1)
    );
    
    onPress();
  }, [disabled, onPress, scale]);

  // Shake animation when showing wrong answer
  React.useEffect(() => {
    if (correct === false && selected) {
      shake.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [correct, selected, shake]);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        style={[
          styles.optionButton,
          { 
            backgroundColor, 
            borderColor,
            opacity: disabled && !selected ? 0.6 : 1,
          },
        ]}
      >
        {/* Option letter (A, B, C, D) */}
        <View style={[styles.optionLetter, { backgroundColor: borderColor + '20' }]}>
          <ThemedText style={[styles.optionLetterText, { color: textColor }]}>
            {String.fromCharCode(65 + index)}
          </ThemedText>
        </View>
        
        {/* Option text */}
        <ThemedText style={[styles.optionText, { color: textColor }]}>
          {text}
        </ThemedText>

        {/* Result indicator */}
        {correct !== undefined && selected && (
          <Feather 
            name={correct ? 'check-circle' : 'x-circle'} 
            size={24} 
            color="#FFFFFF" 
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

// =============================================================================
// MCQ QUESTION COMPONENT
// =============================================================================

/**
 * Multiple Choice Question Component
 * User taps one of 4 options to answer.
 */
export function MCQQuestionComponent({ 
  question, 
  onAnswer, 
  disabled = false,
  showResult = false,
  isCorrect,
}: QuestionProps<MCQType>) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const { theme } = useTheme();

  // Handle option selection
  const handleSelect = useCallback((index: number) => {
    if (disabled) return;
    
    setSelectedIndex(index);
    
    // Automatically submit after short delay
    setTimeout(() => {
      const correct = index === question.correctAnswer;
      onAnswer({
        isCorrect: correct,
        selectedAnswer: index,
        correctAnswer: question.correctAnswer,
        xpEarned: correct ? question.xpReward : 0,
      });
    }, 300);
  }, [disabled, question, onAnswer]);

  return (
    <View style={styles.questionContainer}>
      {/* Question text */}
      <ThemedText style={styles.questionText}>
        {question.question}
      </ThemedText>

      <Spacer height={Spacing.lg} />

      {/* Options */}
      {question.options.map((option, index) => (
        <React.Fragment key={index}>
          <OptionButton
            text={option}
            onPress={() => handleSelect(index)}
            selected={selectedIndex === index}
            disabled={disabled}
            correct={showResult ? (
              index === question.correctAnswer ? true : 
              (selectedIndex === index ? false : undefined)
            ) : undefined}
            index={index}
          />
          <Spacer height={Spacing.sm} />
        </React.Fragment>
      ))}
    </View>
  );
}

// =============================================================================
// TRUE/FALSE QUESTION COMPONENT
// =============================================================================

/**
 * True/False Question Component
 * Simple binary choice between True and False.
 */
export function TrueFalseQuestionComponent({
  question,
  onAnswer,
  disabled = false,
  showResult = false,
}: QuestionProps<TFType>) {
  const [selected, setSelected] = useState<boolean | null>(null);
  const { theme } = useTheme();

  const handleSelect = useCallback((value: boolean) => {
    if (disabled) return;
    
    setSelected(value);
    
    setTimeout(() => {
      const correct = value === question.correctAnswer;
      onAnswer({
        isCorrect: correct,
        selectedAnswer: value ? 1 : 0,
        correctAnswer: question.correctAnswer ? 1 : 0,
        xpEarned: correct ? question.xpReward : 0,
      });
    }, 300);
  }, [disabled, question, onAnswer]);

  // Determine button states
  const getTrueState = () => {
    if (!showResult) return undefined;
    if (question.correctAnswer === true) return true;
    if (selected === true) return false;
    return undefined;
  };

  const getFalseState = () => {
    if (!showResult) return undefined;
    if (question.correctAnswer === false) return true;
    if (selected === false) return false;
    return undefined;
  };

  return (
    <View style={styles.questionContainer}>
      <ThemedText style={styles.questionText}>
        {question.question}
      </ThemedText>

      <Spacer height={Spacing.xl} />

      <View style={styles.trueFalseContainer}>
        {/* True Button */}
        <Pressable
          onPress={() => handleSelect(true)}
          disabled={disabled}
          style={[
            styles.trueFalseButton,
            { 
              backgroundColor: selected === true 
                ? (getTrueState() === true ? '#22C55E' : getTrueState() === false ? '#EF4444' : theme.primary)
                : getTrueState() === true ? '#22C55E20' : theme.card,
              borderColor: selected === true 
                ? (getTrueState() === true ? '#22C55E' : getTrueState() === false ? '#EF4444' : theme.primary)
                : getTrueState() === true ? '#22C55E' : theme.border,
            },
          ]}
        >
          <Feather name="check" size={32} color={selected === true ? '#FFF' : '#22C55E'} />
          <Spacer height={Spacing.xs} />
          <ThemedText style={{ 
            color: selected === true ? '#FFF' : theme.text,
            ...Typography.headline,
          }}>
            True
          </ThemedText>
        </Pressable>

        <Spacer height={Spacing.md} />

        {/* False Button */}
        <Pressable
          onPress={() => handleSelect(false)}
          disabled={disabled}
          style={[
            styles.trueFalseButton,
            { 
              backgroundColor: selected === false 
                ? (getFalseState() === true ? '#22C55E' : getFalseState() === false ? '#EF4444' : theme.primary)
                : getFalseState() === true ? '#22C55E20' : theme.card,
              borderColor: selected === false 
                ? (getFalseState() === true ? '#22C55E' : getFalseState() === false ? '#EF4444' : theme.primary)
                : getFalseState() === true ? '#22C55E' : theme.border,
            },
          ]}
        >
          <Feather name="x" size={32} color={selected === false ? '#FFF' : '#EF4444'} />
          <Spacer height={Spacing.xs} />
          <ThemedText style={{ 
            color: selected === false ? '#FFF' : theme.text,
            ...Typography.headline,
          }}>
            False
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

// =============================================================================
// FILL IN THE BLANK QUESTION COMPONENT
// =============================================================================

/**
 * Fill in the Blank Question Component
 * User types the missing word/number.
 */
export function FillBlankQuestionComponent({
  question,
  onAnswer,
  disabled = false,
  showResult = false,
  isCorrect,
}: QuestionProps<FillType>) {
  const [userInput, setUserInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { theme } = useTheme();

  const handleSubmit = useCallback(() => {
    if (disabled || !userInput.trim()) return;
    
    setSubmitted(true);
    
    // Check if answer matches any accepted answer (case insensitive)
    const isCorrect = question.acceptedAnswers.some(
      answer => answer.toLowerCase() === userInput.trim().toLowerCase()
    );

    onAnswer({
      isCorrect,
      selectedAnswer: userInput.trim(),
      correctAnswer: question.acceptedAnswers[0],
      xpEarned: isCorrect ? question.xpReward : 0,
    });
  }, [disabled, userInput, question, onAnswer]);

  // Split the blanked text into parts
  const textParts = question.blankedText.split('___');

  return (
    <View style={styles.questionContainer}>
      <ThemedText style={styles.questionText}>
        {question.question}
      </ThemedText>

      <Spacer height={Spacing.lg} />

      {/* Fill in the blank display */}
      <View style={styles.fillBlankContainer}>
        <ThemedText style={styles.fillBlankText}>
          {textParts[0]}
        </ThemedText>
        
        <TextInput
          value={userInput}
          onChangeText={setUserInput}
          placeholder="Type answer"
          placeholderTextColor={theme.textSecondary}
          editable={!disabled && !submitted}
          style={[
            styles.fillBlankInput,
            { 
              color: theme.text,
              borderColor: showResult 
                ? (isCorrect ? '#22C55E' : '#EF4444')
                : theme.primary,
              backgroundColor: showResult
                ? (isCorrect ? '#22C55E20' : '#EF444420')
                : theme.card,
            },
          ]}
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
        
        <ThemedText style={styles.fillBlankText}>
          {textParts[1] || ''}
        </ThemedText>
      </View>

      <Spacer height={Spacing.lg} />

      {/* Submit button */}
      {!submitted && (
        <Pressable
          onPress={handleSubmit}
          disabled={disabled || !userInput.trim()}
          style={[
            styles.submitButton,
            { 
              backgroundColor: userInput.trim() ? theme.primary : theme.border,
            },
          ]}
        >
          <ThemedText style={styles.submitButtonText}>
            Check Answer
          </ThemedText>
        </Pressable>
      )}

      {/* Show correct answer if wrong */}
      {showResult && !isCorrect && (
        <View style={styles.correctAnswerContainer}>
          <ThemedText style={{ color: theme.textSecondary }}>
            Correct answer: 
          </ThemedText>
          <ThemedText style={{ color: '#22C55E', fontWeight: '600' }}>
            {' '}{question.acceptedAnswers[0]}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

// =============================================================================
// MATCHING QUESTION COMPONENT
// =============================================================================

/**
 * Matching Question Component
 * User connects items from two columns.
 */
export function MatchingQuestionComponent({
  question,
  onAnswer,
  disabled = false,
  showResult = false,
}: QuestionProps<MatchType>) {
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matches, setMatches] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const { theme } = useTheme();

  // Shuffle right items for display (but keep track of original indices)
  const shuffledRight = useMemo(() => {
    const indices = question.rightItems.map((_, i) => i);
    // Simple shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [question.rightItems]);

  const handleLeftSelect = (index: number) => {
    if (disabled || submitted) return;
    setSelectedLeft(index);
  };

  const handleRightSelect = (displayIndex: number) => {
    if (disabled || submitted || selectedLeft === null) return;
    
    const actualRightIndex = shuffledRight[displayIndex];
    
    // Record the match
    setMatches(prev => ({
      ...prev,
      [selectedLeft]: actualRightIndex,
    }));
    
    setSelectedLeft(null);
  };

  const handleSubmit = useCallback(() => {
    if (Object.keys(matches).length !== question.leftItems.length) return;
    
    setSubmitted(true);
    
    // Check if all matches are correct
    let correctCount = 0;
    for (let i = 0; i < question.leftItems.length; i++) {
      if (matches[i] === question.correctMatches[i]) {
        correctCount++;
      }
    }
    
    const allCorrect = correctCount === question.leftItems.length;
    
    onAnswer({
      isCorrect: allCorrect,
      selectedAnswer: Object.values(matches),
      correctAnswer: question.correctMatches,
      xpEarned: allCorrect ? question.xpReward : Math.round(question.xpReward * correctCount / question.leftItems.length),
    });
  }, [matches, question, onAnswer]);

  // Check if a match is correct (for showing results)
  const isMatchCorrect = (leftIndex: number): boolean | undefined => {
    if (!showResult) return undefined;
    return matches[leftIndex] === question.correctMatches[leftIndex];
  };

  return (
    <View style={styles.questionContainer}>
      <ThemedText style={styles.questionText}>
        {question.question}
      </ThemedText>

      <Spacer height={Spacing.lg} />

      <View style={styles.matchingContainer}>
        {/* Left column */}
        <View style={styles.matchingColumn}>
          {question.leftItems.map((item, index) => {
            const isSelected = selectedLeft === index;
            const hasMatch = matches[index] !== undefined;
            const matchResult = isMatchCorrect(index);
            
            return (
              <Pressable
                key={`left-${index}`}
                onPress={() => handleLeftSelect(index)}
                disabled={disabled || submitted}
                style={[
                  styles.matchingItem,
                  {
                    backgroundColor: isSelected ? theme.primary : 
                      matchResult === true ? '#22C55E' :
                      matchResult === false ? '#EF4444' :
                      hasMatch ? theme.primary + '40' : theme.card,
                    borderColor: isSelected ? theme.primary :
                      matchResult === true ? '#22C55E' :
                      matchResult === false ? '#EF4444' :
                      hasMatch ? theme.primary : theme.border,
                  },
                ]}
              >
                <ThemedText style={{ 
                  color: isSelected || matchResult !== undefined ? '#FFF' : theme.text,
                  textAlign: 'center',
                }}>
                  {item}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Connection indicator */}
        <View style={styles.matchingConnector}>
          <Feather name="link" size={20} color={theme.textSecondary} />
        </View>

        {/* Right column */}
        <View style={styles.matchingColumn}>
          {shuffledRight.map((actualIndex, displayIndex) => {
            const item = question.rightItems[actualIndex];
            const matchedBy = Object.entries(matches).find(([_, v]) => v === actualIndex);
            const isMatched = matchedBy !== undefined;
            
            return (
              <Pressable
                key={`right-${displayIndex}`}
                onPress={() => handleRightSelect(displayIndex)}
                disabled={disabled || submitted || selectedLeft === null}
                style={[
                  styles.matchingItem,
                  {
                    backgroundColor: isMatched ? theme.primary + '40' : theme.card,
                    borderColor: isMatched ? theme.primary : theme.border,
                    opacity: selectedLeft !== null ? 1 : 0.7,
                  },
                ]}
              >
                <ThemedText style={{ 
                  color: theme.text,
                  textAlign: 'center',
                }}>
                  {item}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Spacer height={Spacing.lg} />

      {/* Submit button */}
      {!submitted && (
        <Pressable
          onPress={handleSubmit}
          disabled={Object.keys(matches).length !== question.leftItems.length}
          style={[
            styles.submitButton,
            { 
              backgroundColor: Object.keys(matches).length === question.leftItems.length 
                ? theme.primary 
                : theme.border,
            },
          ]}
        >
          <ThemedText style={styles.submitButtonText}>
            Check Matches
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

// =============================================================================
// ORDERING QUESTION COMPONENT
// =============================================================================

/**
 * Ordering Question Component
 * User taps items to reorder them correctly.
 */
export function OrderingQuestionComponent({
  question,
  onAnswer,
  disabled = false,
  showResult = false,
}: QuestionProps<OrderType>) {
  // Shuffle items initially
  const [orderedItems, setOrderedItems] = useState<string[]>(() => {
    const shuffled = [...question.items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  });
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const { theme } = useTheme();

  const handleSelect = (index: number) => {
    if (disabled || submitted) return;
    
    if (selectedIndex === null) {
      // First selection
      setSelectedIndex(index);
    } else {
      // Second selection - swap items
      const newOrder = [...orderedItems];
      [newOrder[selectedIndex], newOrder[index]] = [newOrder[index], newOrder[selectedIndex]];
      setOrderedItems(newOrder);
      setSelectedIndex(null);
    }
  };

  const handleSubmit = useCallback(() => {
    setSubmitted(true);
    
    // Check if order matches correct order
    const isCorrect = orderedItems.every((item, index) => item === question.items[index]);
    
    onAnswer({
      isCorrect,
      selectedAnswer: orderedItems,
      correctAnswer: question.items,
      xpEarned: isCorrect ? question.xpReward : 0,
    });
  }, [orderedItems, question, onAnswer]);

  // Check if an item is in correct position (for showing results)
  const isPositionCorrect = (index: number): boolean | undefined => {
    if (!showResult) return undefined;
    return orderedItems[index] === question.items[index];
  };

  return (
    <View style={styles.questionContainer}>
      <ThemedText style={styles.questionText}>
        {question.instruction}
      </ThemedText>

      <Spacer height={Spacing.lg} />

      {/* Orderable items */}
      {orderedItems.map((item, index) => {
        const isSelected = selectedIndex === index;
        const positionCorrect = isPositionCorrect(index);
        
        return (
          <React.Fragment key={`order-${index}`}>
            <Pressable
              onPress={() => handleSelect(index)}
              disabled={disabled || submitted}
              style={[
                styles.orderingItem,
                {
                  backgroundColor: isSelected ? theme.primary :
                    positionCorrect === true ? '#22C55E' :
                    positionCorrect === false ? '#EF4444' :
                    theme.card,
                  borderColor: isSelected ? theme.primary :
                    positionCorrect === true ? '#22C55E' :
                    positionCorrect === false ? '#EF4444' :
                    theme.border,
                },
              ]}
            >
              {/* Position number */}
              <View style={[
                styles.orderNumber,
                { backgroundColor: isSelected || positionCorrect !== undefined ? 'rgba(255,255,255,0.2)' : theme.border },
              ]}>
                <ThemedText style={{ 
                  color: isSelected || positionCorrect !== undefined ? '#FFF' : theme.text,
                  fontWeight: '600',
                }}>
                  {index + 1}
                </ThemedText>
              </View>
              
              {/* Item text */}
              <ThemedText style={{ 
                color: isSelected || positionCorrect !== undefined ? '#FFF' : theme.text,
                flex: 1,
              }}>
                {item}
              </ThemedText>

              {/* Result indicator */}
              {positionCorrect !== undefined && (
                <Feather 
                  name={positionCorrect ? 'check' : 'x'} 
                  size={20} 
                  color="#FFF" 
                />
              )}
            </Pressable>
            <Spacer height={Spacing.sm} />
          </React.Fragment>
        );
      })}

      <Spacer height={Spacing.md} />

      {/* Instruction hint */}
      {!submitted && selectedIndex !== null && (
        <ThemedText style={{ color: theme.textSecondary, textAlign: 'center' }}>
          Tap another item to swap positions
        </ThemedText>
      )}

      <Spacer height={Spacing.md} />

      {/* Submit button */}
      {!submitted && (
        <Pressable
          onPress={handleSubmit}
          style={[styles.submitButton, { backgroundColor: theme.primary }]}
        >
          <ThemedText style={styles.submitButtonText}>
            Check Order
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

// =============================================================================
// SCENARIO QUESTION COMPONENT
// =============================================================================

/**
 * Scenario Question Component
 * User makes a decision in a financial scenario.
 */
export function ScenarioQuestionComponent({
  question,
  onAnswer,
  disabled = false,
  showResult = false,
}: QuestionProps<ScenarioType>) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showOutcome, setShowOutcome] = useState(false);
  const { theme } = useTheme();

  const handleSelect = useCallback((index: number) => {
    if (disabled || showOutcome) return;
    
    setSelectedIndex(index);
    setShowOutcome(true);
    
    setTimeout(() => {
      const isBest = index === question.bestOptionIndex;
      const impactScore = question.options[index].impactScore;
      
      onAnswer({
        isCorrect: isBest,
        selectedAnswer: index,
        correctAnswer: question.bestOptionIndex,
        // Partial XP based on impact score
        xpEarned: isBest 
          ? question.xpReward 
          : Math.max(0, Math.round(question.xpReward * (impactScore / 100) * 0.5)),
      });
    }, 2000); // Show outcome for 2 seconds
  }, [disabled, showOutcome, question, onAnswer]);

  return (
    <View style={styles.questionContainer}>
      {/* Scenario description */}
      <View style={[styles.scenarioBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText style={[styles.scenarioText, { color: theme.text }]}>
          {question.scenario}
        </ThemedText>
      </View>

      <Spacer height={Spacing.lg} />

      <ThemedText style={styles.questionText}>
        {question.question}
      </ThemedText>

      <Spacer height={Spacing.lg} />

      {/* Options */}
      {question.options.map((option, index) => {
        const isSelected = selectedIndex === index;
        const isBest = index === question.bestOptionIndex;
        const impactScore = option.impactScore;
        
        // Determine color based on impact score
        const getImpactColor = () => {
          if (!showOutcome) return theme.card;
          if (impactScore >= 80) return '#22C55E';  // Great choice
          if (impactScore >= 50) return '#EAB308';  // OK choice
          if (impactScore >= 0) return '#F97316';   // Poor choice
          return '#EF4444';                          // Bad choice
        };

        return (
          <React.Fragment key={index}>
            <Pressable
              onPress={() => handleSelect(index)}
              disabled={disabled || showOutcome}
              style={[
                styles.scenarioOption,
                {
                  backgroundColor: isSelected && showOutcome ? getImpactColor() : 
                    isSelected ? theme.primary : theme.card,
                  borderColor: isSelected && showOutcome ? getImpactColor() :
                    isSelected ? theme.primary : theme.border,
                },
              ]}
            >
              <ThemedText style={{ 
                color: isSelected ? '#FFF' : theme.text,
                flex: 1,
              }}>
                {option.text}
              </ThemedText>
              
              {/* Show if this is the best option (after selection) */}
              {showOutcome && isBest && (
                <View style={styles.bestBadge}>
                  <ThemedText style={{ color: '#FFF', fontSize: 10 }}>BEST</ThemedText>
                </View>
              )}
            </Pressable>

            {/* Show outcome if selected */}
            {isSelected && showOutcome && (
              <View style={[styles.outcomeBox, { backgroundColor: getImpactColor() + '20' }]}>
                <ThemedText style={{ color: theme.text }}>
                  {option.outcome}
                </ThemedText>
              </View>
            )}

            <Spacer height={Spacing.sm} />
          </React.Fragment>
        );
      })}
    </View>
  );
}

// =============================================================================
// CALCULATION QUESTION COMPONENT
// =============================================================================

/**
 * Calculation Question Component
 * User solves a math problem.
 */
export function CalculationQuestionComponent({
  question,
  onAnswer,
  disabled = false,
  showResult = false,
  isCorrect,
}: QuestionProps<CalcType>) {
  const [userInput, setUserInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { theme } = useTheme();

  const handleSubmit = useCallback(() => {
    if (disabled || !userInput.trim()) return;
    
    setSubmitted(true);
    
    // Parse the user input, handling potential NaN
    const cleanedInput = userInput.replace(/[^0-9.-]/g, '');
    const userNumber = parseFloat(cleanedInput);
    
    // If input is not a valid number, mark as incorrect
    if (isNaN(userNumber)) {
      onAnswer({
        isCorrect: false,
        selectedAnswer: 0,
        correctAnswer: question.correctAnswer,
        xpEarned: 0,
      });
      return;
    }
    
    // Check if answer is within acceptable tolerance
    const isWithinTolerance = Math.abs(userNumber - question.correctAnswer) <= question.tolerance;

    onAnswer({
      isCorrect: isWithinTolerance,
      selectedAnswer: userNumber,
      correctAnswer: question.correctAnswer,
      xpEarned: isWithinTolerance ? question.xpReward : 0,
    });
  }, [disabled, userInput, question, onAnswer]);

  return (
    <View style={styles.questionContainer}>
      <ThemedText style={styles.questionText}>
        {question.question}
      </ThemedText>

      <Spacer height={Spacing.lg} />

      {/* Problem display */}
      <View style={[styles.calculationBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText style={[styles.calculationText, { color: theme.text }]}>
          {question.problemText}
        </ThemedText>
      </View>

      <Spacer height={Spacing.lg} />

      {/* Answer input */}
      <View style={styles.calculationInputContainer}>
        {question.unit && (
          <ThemedText style={[styles.unitText, { color: theme.textSecondary }]}>
            {question.unit}
          </ThemedText>
        )}
        <TextInput
          value={userInput}
          onChangeText={setUserInput}
          placeholder="Your answer"
          placeholderTextColor={theme.textSecondary}
          keyboardType="numeric"
          editable={!disabled && !submitted}
          style={[
            styles.calculationInput,
            {
              color: theme.text,
              borderColor: showResult
                ? (isCorrect ? '#22C55E' : '#EF4444')
                : theme.primary,
              backgroundColor: theme.card,
            },
          ]}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
      </View>

      <Spacer height={Spacing.lg} />

      {/* Submit button */}
      {!submitted && (
        <Pressable
          onPress={handleSubmit}
          disabled={disabled || !userInput.trim()}
          style={[
            styles.submitButton,
            { backgroundColor: userInput.trim() ? theme.primary : theme.border },
          ]}
        >
          <ThemedText style={styles.submitButtonText}>
            Check Answer
          </ThemedText>
        </Pressable>
      )}

      {/* Show correct answer if wrong */}
      {showResult && !isCorrect && (
        <View style={styles.correctAnswerContainer}>
          <ThemedText style={{ color: theme.textSecondary }}>
            Correct answer: 
          </ThemedText>
          <ThemedText style={{ color: '#22C55E', fontWeight: '600' }}>
            {' '}{question.unit}{question.correctAnswer}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

// =============================================================================
// QUESTION RENDERER (Picks the right component based on type)
// =============================================================================

interface QuestionRendererProps {
  question: Question;
  onAnswer: (result: QuestionResult) => void;
  disabled?: boolean;
  showResult?: boolean;
  isCorrect?: boolean;
}

export function QuestionRenderer({ 
  question, 
  onAnswer, 
  disabled, 
  showResult, 
  isCorrect 
}: QuestionRendererProps) {
  const props = { onAnswer, disabled, showResult, isCorrect };

  switch (question.type) {
    case 'mcq':
      return <MCQQuestionComponent question={question as MCQType} {...props} />;
    case 'true_false':
      return <TrueFalseQuestionComponent question={question as TFType} {...props} />;
    case 'fill_blank':
      return <FillBlankQuestionComponent question={question as FillType} {...props} />;
    case 'matching':
      return <MatchingQuestionComponent question={question as MatchType} {...props} />;
    case 'ordering':
      return <OrderingQuestionComponent question={question as OrderType} {...props} />;
    case 'scenario':
      return <ScenarioQuestionComponent question={question as ScenarioType} {...props} />;
    case 'calculation':
      return <CalculationQuestionComponent question={question as CalcType} {...props} />;
    default:
      return (
        <ThemedText>Unknown question type: {(question as Question).type}</ThemedText>
      );
  }
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  questionContainer: {
    paddingHorizontal: Spacing.lg,
  },
  questionText: {
    ...Typography.headline,
    fontSize: 20,
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  optionLetterText: {
    ...Typography.headline,
  },
  optionText: {
    ...Typography.body,
    flex: 1,
  },
  trueFalseContainer: {
    flexDirection: 'column',
    gap: Spacing.md,
  },
  trueFalseButton: {
    flex: 1,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fillBlankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  fillBlankText: {
    ...Typography.headline,
  },
  fillBlankInput: {
    ...Typography.headline,
    borderWidth: 2,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.xs,
    minWidth: 100,
    textAlign: 'center',
  },
  submitButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  submitButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },
  correctAnswerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  matchingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  matchingColumn: {
    flex: 1,
  },
  matchingConnector: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.lg,
  },
  matchingItem: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    marginBottom: Spacing.sm,
    minHeight: 60,
    justifyContent: 'center',
  },
  orderingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  orderNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  scenarioBox: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  scenarioText: {
    ...Typography.body,
    lineHeight: 24,
  },
  scenarioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  bestBadge: {
    backgroundColor: '#22C55E',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  outcomeBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
    marginLeft: Spacing.lg,
  },
  calculationBox: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  calculationText: {
    ...Typography.title,
  },
  calculationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitText: {
    ...Typography.headline,
    fontSize: 20,
    marginRight: Spacing.xs,
  },
  calculationInput: {
    ...Typography.headline,
    fontSize: 20,
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minWidth: 150,
    textAlign: 'center',
  },
});
