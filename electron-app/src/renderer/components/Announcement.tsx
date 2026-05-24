import React, { useState, useEffect, useRef } from 'react'
import './Announcement.css'

interface AnnouncementProps {
  content: string
  announcements: { content: string; date: string }[]
  onShowAll: () => void
}

export const Announcement: React.FC<AnnouncementProps> = ({
  content,
  announcements,
  onShowAll
}) => {
  const [isScrolling, setIsScrolling] = useState(false)
  const [text, setText] = useState(content)
  const [needsScrolling, setNeedsScrolling] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    setText(content)
  }, [content])

  useEffect(() => {
    const checkWidth = () => {
      if (scrollRef.current) {
        const textWidth = scrollRef.current.scrollWidth
        const containerWidth = scrollRef.current.parentElement?.clientWidth || 570
        setNeedsScrolling(textWidth > containerWidth)
      }
    }

    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => window.removeEventListener('resize', checkWidth)
  }, [text])

  useEffect(() => {
    if (!needsScrolling || !isScrolling) return

    const scroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
        if (scrollLeft >= scrollWidth - clientWidth) {
          scrollRef.current.scrollLeft = 0
        } else {
          scrollRef.current.scrollLeft += 2
        }
      }
      animationRef.current = requestAnimationFrame(scroll)
    }

    animationRef.current = requestAnimationFrame(scroll)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [needsScrolling, isScrolling])

  const handleMouseEnter = () => {
    if (needsScrolling) {
      setIsScrolling(true)
    }
  }

  const handleMouseLeave = () => {
    setIsScrolling(false)
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0
    }
  }

  return (
    <div className="announcement">
      <div
        className="announcement-scroll"
        ref={scrollRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {text}
      </div>
      <button className="announcement-btn" onClick={onShowAll}>
        查看公告
      </button>
    </div>
  )
}
