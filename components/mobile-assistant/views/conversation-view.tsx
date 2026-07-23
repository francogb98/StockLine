'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bot, User, Send, Square } from 'lucide-react'
import { useAssistant } from '../context'
import { staggerContainer, fadeIn } from '../animation-variants'
import { useData } from '@/lib/store-context'
import { useAuth } from '@/lib/store-context'
import { processFreeText } from '@/lib/assistant-service'
import type { AssistantView } from '../types'

export function ConversationView() {
  const { state, navigateTo, sendText } = useAssistant()
  const { messages } = state
  const { sales, products, categories } = useData()
  const { store } = useAuth()

  const [input, setInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (messages.length > 0) {
      const last = messages[messages.length - 1]
      if (last.role === 'assistant' && last.content === 'Procesando tu pregunta...') {
        const userMsg = messages[messages.length - 2]
        if (userMsg?.role === 'user') {
          const data = {
            sales,
            products,
            categories: categories.map((c) => ({
              ...c,
              _count: { products: products.filter((p) => p.categoryId === c.id).length } as any,
            })),
            store,
            cashSession: null,
            userCount: 0,
          }
          const answer = processFreeText(userMsg.content, data)
          last.content = answer.text
          if (answer.action) {
            last.action = { label: answer.action.label, view: answer.action.view as AssistantView }
          }
          setProcessing(false)
        }
      }
    }
  }, [messages, sales, products, categories, store])

  const handleSend = () => {
    const text = input.trim()
    if (!text || processing) return

    setInput('')
    setProcessing(true)
    sendText(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <Bot className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Escribí una pregunta o seleccioná una pregunta frecuente para empezar.
            </p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-4 px-5 py-4"
          >
            {messages.map((msg, i) => (
              <motion.div
                key={msg.id}
                variants={fadeIn}
                custom={i}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}

                <div className={`max-w-[82%] ${msg.role === 'user' ? 'order-1' : 'order-2'}`}>
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'rounded-br-sm bg-primary text-primary-foreground'
                        : 'rounded-bl-sm border bg-card text-card-foreground shadow-sm'
                    }`}
                  >
                    {msg.content === 'Procesando tu pregunta...' ? (
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
                      </span>
                    ) : (
                      msg.content.split('\n').map((line, j) => (
                        <p key={j} className={line.trim() === '' ? 'h-2' : ''}>
                          {line || '\u00A0'}
                        </p>
                      ))
                    )}
                  </div>

                  {msg.role === 'assistant' && msg.action && msg.content !== 'Procesando tu pregunta...' && (
                    <motion.button
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigateTo(msg.action!.view)}
                      className="mt-2 flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                    >
                      <span>{msg.action.label}</span>
                    </motion.button>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary">
                    <User className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
            <div ref={bottomRef} />
          </motion.div>
        )}
      </div>

      <div className="border-t bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribí tu pregunta..."
            disabled={processing}
            className="flex-1 rounded-xl border bg-background px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/30 focus:ring-1 focus:ring-primary/20 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || processing}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {processing ? (
              <Square className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
