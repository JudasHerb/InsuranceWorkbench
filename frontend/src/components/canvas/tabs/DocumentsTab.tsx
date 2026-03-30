import { useRef, useState } from 'react'
import { workbenchApi } from '../../../services/api/workbenchApi'
import { useSubmissionStore } from '../../../store/submissionStore'

export default function DocumentsTab() {
  const { currentSubmission, setCurrentSubmission } = useSubmissionStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [docType, setDocType] = useState('wording')
  const [uploading, setUploading] = useState(false)

  if (!currentSubmission) return null

  const { documents, submissionId } = currentSubmission

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await workbenchApi.uploadDocument(submissionId, file, docType)
      const updated = await workbenchApi.getSubmission(submissionId)
      setCurrentSubmission(updated)
    } catch {
      // ignore
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDownload = async (docId: string) => {
    try {
      const url = await workbenchApi.getDocumentDownloadUrl(submissionId, docId)
      window.open(url, '_blank')
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
          <select value={docType} onChange={(e) => setDocType(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm">
            <option value="slip">Slip</option>
            <option value="wording">Wording</option>
            <option value="endorsement">Endorsement</option>
          </select>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
            id="doc-upload"
          />
          <label htmlFor="doc-upload"
            className="cursor-pointer px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 inline-block">
            {uploading ? 'Uploading…' : 'Upload Document'}
          </label>
        </div>
        <p className="text-xs text-gray-400">PDF or DOCX only</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['File Name', 'Type', 'Uploaded', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {documents.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No documents uploaded</td></tr>
            )}
            {documents.map((d) => (
              <tr key={d.documentId}>
                <td className="px-4 py-3 font-medium text-gray-900">{d.fileName}</td>
                <td className="px-4 py-3 text-gray-500 capitalize">{d.documentType}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(d.uploadedAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDownload(d.documentId)}
                    className="text-indigo-600 hover:underline text-xs"
                  >
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
