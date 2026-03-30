import { useEffect, useRef, useState } from 'react'
import { workbenchApi } from '../../services/api/workbenchApi'
import { useSubmissionStore } from '../../store/submissionStore'

interface Message {
  id: string
  role: 'user' | 'agent'
  text: string
  timestamp: Date
}

interface ChatDrawerProps {
  open: boolean
  onClose: () => void
}

export default function ChatDrawer({ open, onClose }: ChatDrawerProps) {
  const { currentSubmission } = useSubmissionStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const addMessage = (role: Message['role'], text: string) => {
    setMessages((m) => [...m, { id: Date.now().toString(), role, text, timestamp: new Date() }])
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')
    addMessage('user', text)
    setSending(true)

    try {
      if (text.startsWith('/dev ') && currentSubmission) {
        const description = text.slice(5)
        addMessage('agent', `Generating developer tool: "${description}"…`)
        await workbenchApi.createDevTool({
          taskDescription: description,
          submissionId: currentSubmission.submissionId,
        })
        addMessage('agent', 'Developer tool request submitted. Check the DevTool panel for build progress.')
      } else if (text.startsWith('/legal') && currentSubmission) {
        addMessage('agent', 'Dispatching legal review…')
        await workbenchApi.dispatchAgentTask(currentSubmission.submissionId, { agentType: 'legal', input: {} })
        addMessage('agent', 'Legal review dispatched. Check the Agent Panel for streaming output.')
      } else if (text.startsWith('/names') && currentSubmission) {
        addMessage('agent', 'Names clearance is triggered automatically on submission creation.')
      } else if (text.startsWith('/b2b') && currentSubmission) {
        addMessage('agent', 'To initiate B2B negotiation, go to the Layers tab and add a FacRi panel first.')
      } else if (text.startsWith('/')) {
        addMessage('agent', 'Unknown command. Available commands: /dev <description>, /legal, /names, /b2b')
      } else {
        addMessage('agent', 'I can help you with your submission. Try a slash command: /dev, /legal, /names, /b2b')
      }
    } catch {
      addMessage('agent', 'An error occurred. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-200 flex flex-col z-40">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">Workbench Assistant</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-8">
            Type a command to get started.<br />
            <span className="font-mono text-xs">/dev, /legal, /names, /b2b</span>
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
              m.role === 'user'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="border-t border-gray-200 p-3 flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message or /command…"
          disabled={sending}
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button type="submit" disabled={sending || !input.trim()}
          className="px-3 py-2 bg-indigo-600 text-white rounded text-sm disabled:opacity-40 hover:bg-indigo-700">
          Send
        </button>
      </form>
    </div>
  )
}
