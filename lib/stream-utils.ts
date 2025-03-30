/**
 * Utilities for smoother streaming responses in BK Zen Vibe
 */
import { useState, useEffect, useRef } from 'react';

/**
 * Generator function that breaks text into smaller chunks with natural typing delays
 * for smoother animation of chat responses
 */
export async function* smoothChunker(text: string, chunkSize: number = 3, delayMs: number = 10) {
  let remaining = text;
  
  while (remaining.length > 0) {
    // Determine chunk size - vary it slightly for more natural effect
    const actualChunkSize = Math.max(1, Math.min(
      chunkSize + Math.floor(Math.random() * 3) - 1,
      remaining.length
    ));
    
    const chunk = remaining.substring(0, actualChunkSize);
    remaining = remaining.substring(actualChunkSize);
    
    // Add a small delay for typing effect
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    yield chunk;
  }
}

/**
 * Process a stream of text chunks into smaller, smoother chunks for better animation
 * @param textStream The original stream of text chunks
 * @param chunkSize The target size for smaller chunks (default: 3 characters)
 * @param delayMs The delay between chunks in milliseconds (default: 10ms)
 */
export async function* smoothStreamProcessor(
  textStream: AsyncIterable<{ text: () => string }>,
  chunkSize: number = 3,
  delayMs: number = 10
) {
  let buffer = "";
  
  for await (const chunk of textStream) {
    const text = chunk.text();
    if (text) {
      buffer += text;
      
      // Process buffer into smaller chunks
      while (buffer.length >= chunkSize) {
        // Vary chunk size slightly for more natural effect
        const actualChunkSize = Math.max(1, Math.min(
          chunkSize + Math.floor(Math.random() * 3) - 1,
          buffer.length
        ));
        
        const sendChunk = buffer.substring(0, actualChunkSize);
        buffer = buffer.substring(actualChunkSize);
        
        // Add a small delay for typing effect
        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
        yield sendChunk;
      }
    }
  }
  
  // Send any remaining text in the buffer
  if (buffer.length > 0) {
    yield buffer;
  }
}

/**
 * React hook for smooth typing animation effect
 * @param finalText The complete text that will be displayed
 * @param typingSpeed Speed of typing in milliseconds per character (lower = faster)
 * @param initialDelay Delay before typing starts in milliseconds
 * @returns The current text to display with typing animation
 */
export function useTypingAnimation(
  finalText: string,
  typingSpeed: number = 15,
  initialDelay: number = 0
) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const textRef = useRef(finalText);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(0);
  
  useEffect(() => {
    textRef.current = finalText;
    setDisplayText('');
    setIsComplete(false);
    
    if (!finalText) {
      setIsComplete(true);
      return;
    }

    // Add initial delay if specified
    if (initialDelay > 0) {
      setTimeout(() => {
        lastUpdateRef.current = performance.now();
        animationFrameRef.current = requestAnimationFrame(animate);
      }, initialDelay);
    } else {
      lastUpdateRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [finalText, initialDelay]);

  const animate = (timestamp: number) => {
    if (!animationFrameRef.current) return;

    const deltaTime = timestamp - lastUpdateRef.current;
    const charsToAdd = Math.floor(deltaTime / typingSpeed);

    if (charsToAdd > 0) {
      const currentLength = displayText.length;
      const targetText = textRef.current;
      
      if (currentLength < targetText.length) {
        // Add characters with variable speed for more natural effect
        const newLength = Math.min(
          currentLength + charsToAdd + Math.floor(Math.random() * 2),
          targetText.length
        );
        
        setDisplayText(targetText.slice(0, newLength));
        lastUpdateRef.current = timestamp;
        
        if (newLength < targetText.length) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setIsComplete(true);
        }
      } else {
        setIsComplete(true);
      }
    } else {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  };

  return { displayText, isComplete };
}
