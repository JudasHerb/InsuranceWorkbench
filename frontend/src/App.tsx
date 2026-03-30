import { useEffect, lazy, Suspense, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { workbenchHub } from './services/signalr/workbenchHub'
import { usePortfolioStore } from './store/portfolioStore'
import { useSubmissionStore } from './store/submissionStore'
import ChatDrawer from './components/drawers/ChatDrawer'

const PortfolioView = lazy(() => import('./components/canvas/PortfolioView'))
const SubmissionView = lazy(() => import('./components/canvas/SubmissionView'))

function HubConnector() {
  const applyPortfolioUpdated = usePortfolioStore((s) => s.applyPortfolioUpdated)
  const updateSubmission = useSubmissionStore((s) => s.updateSubmission)
  const upsertAgentTask = useSubmissionStore((s) => s.upsertAgentTask)
  const appendOutputChunk = useSubmissionStore((s) => s.appendOutputChunk)

  useEffect(() => {
    workbenchHub.start().catch(console.error)

    workbenchHub.onPortfolioUpdated(applyPortfolioUpdated)
    workbenchHub.onAgentTaskUpdate((payload) => {
      if (payload.outputChunk) appendOutputChunk(payload.taskId, payload.outputChunk)
    })

    return () => {
      workbenchHub.offPortfolioUpdated(applyPortfolioUpdated)
    }
  }, [applyPortfolioUpdated, updateSubmission, upsertAgentTask, appendOutputChunk])

  return null
}

export default function App() {
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault()
        setChatOpen((o) => !o)
      }
      if (e.key === 'Escape') setChatOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <BrowserRouter>
      <HubConnector />
      <div className="min-h-screen bg-gray-50">
        <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-500">Loading…</div>}>
          <Routes>
            <Route path="/" element={<PortfolioView />} />
            <Route path="/submissions/:id" element={<SubmissionView />} />
          </Routes>
        </Suspense>

        {/* Footer chat button */}
        <button
          onClick={() => setChatOpen((o) => !o)}
          className="fixed bottom-4 right-4 bg-indigo-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-indigo-700 z-30"
          title="Open assistant (Ctrl+Space)"
        >
          💬
        </button>

        <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
    </BrowserRouter>
  )
}
