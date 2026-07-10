"use client"

import { useEffect, useState } from "react"

interface TypewriterProps {
  words: string[]
  speed?: number
  delayBetweenWords?: number
  cursor?: boolean
  cursorChar?: string
  loop?: boolean
  trigger?: boolean
}

export function Typewriter({
  words,
  speed = 100,
  delayBetweenWords = 2000,
  cursor = true,
  cursorChar = "|",
  loop = true,
  trigger = true,
}: TypewriterProps) {
  const [displayText, setDisplayText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [wordIndex, setWordIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [showCursor, setShowCursor] = useState(true)

  // Reset/Pause if trigger is false
  useEffect(() => {
    if (!trigger) {
      setDisplayText("")
      setIsDeleting(false)
      setWordIndex(0)
      setCharIndex(0)
    }
  }, [trigger])

  const currentWord = words[wordIndex] || ""

  useEffect(() => {
    if (!trigger) return
    if (words.length === 0) return

    const timeout = setTimeout(
      () => {
        // Typing logic
        if (!isDeleting) {
          if (charIndex < currentWord.length) {
            setDisplayText(currentWord.substring(0, charIndex + 1))
            setCharIndex(charIndex + 1)
          } else {
            // Word is complete
            if (loop) {
              setTimeout(() => {
                setIsDeleting(true)
              }, delayBetweenWords)
            }
          }
        } else {
          // Deleting logic
          if (charIndex > 0) {
            setDisplayText(currentWord.substring(0, charIndex - 1))
            setCharIndex(charIndex - 1)
          } else {
            // Word is deleted, move to next word
            setIsDeleting(false)
            setWordIndex((prev) => (prev + 1) % words.length)
          }
        }
      },
      isDeleting ? speed / 2 : speed,
    )

    return () => clearTimeout(timeout)
  }, [charIndex, currentWord, isDeleting, speed, delayBetweenWords, wordIndex, words, loop, trigger])

  // Cursor blinking effect
  useEffect(() => {
    if (!cursor) return

    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev)
    }, 500)

    return () => clearInterval(cursorInterval)
  }, [cursor])

  return (
    <div className="inline-block">
      <span>
        {displayText}
        {cursor && (
          <span className="ml-1 text-orange-500 font-bold transition-opacity duration-75" style={{ opacity: showCursor ? 1 : 0 }}>
            {cursorChar}
          </span>
        )}
      </span>
    </div>
  )
}
