import { useState } from 'react'
import { workbenchApi } from '../../../services/api/workbenchApi'
import { useSubmissionStore } from '../../../store/submissionStore'

interface LayerForm {
  layerType: string
  limit: string
  attachmentPoint: string
  lineSize: string
  premium: string
  currency: string
}

const emptyForm = (): LayerForm => ({
  layerType: 'primary', limit: '', attachmentPoint: '', lineSize: '', premium: '', currency: 'USD'
})

export default function LayerStructureTab() {
  const { currentSubmission, upsertLayer, removeLayer } = useSubmissionStore()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<LayerForm>(emptyForm())
  const [saving, setSaving] = useState(false)

  if (!currentSubmission) return null

  const { submissionId, layers } = currentSubmission
  const totalExposure = layers.reduce((sum, l) => sum + l.lineSize, 0)

  const openAdd = () => { setEditId(null); setForm(emptyForm()); setShowForm(true) }
  const openEdit = (id: string) => {
    const l = layers.find((x) => x.id === id)
    if (!l) return
    setEditId(id)
    setForm({ layerType: l.layerType, limit: String(l.limit), attachmentPoint: String(l.attachmentPoint), lineSize: String(l.lineSize), premium: String(l.premium), currency: l.currency })
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const layerType = form.layerType as 'primary' | 'excess'
    try {
      if (editId) {
        const updated = await workbenchApi.updateLayer(submissionId, editId, {
          layerType,
          limit: parseFloat(form.limit),
          attachmentPoint: parseFloat(form.attachmentPoint),
          lineSize: parseFloat(form.lineSize),
          premium: parseFloat(form.premium),
          currency: form.currency,
        })
        upsertLayer(updated)
      } else {
        const created = await workbenchApi.addLayer(submissionId, {
          layerType,
          layerNo: 0,
          limit: parseFloat(form.limit),
          attachmentPoint: parseFloat(form.attachmentPoint),
          lineSize: parseFloat(form.lineSize),
          premium: parseFloat(form.premium),
          currency: form.currency,
          status: 'quoted' as const,
        })
        upsertLayer(created)
      }
      setShowForm(false)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (layerId: string) => {
    if (!confirm('Remove this layer?')) return
    try {
      await workbenchApi.deleteLayer(submissionId, layerId)
      removeLayer(layerId)
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Total line exposure: <span className="font-semibold text-gray-800">{totalExposure.toLocaleString()} {layers[0]?.currency ?? 'USD'}</span>
        </div>
        {currentSubmission.status !== 'bound' && (
          <button onClick={openAdd} className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700">
            + Add Layer
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['#', 'Type', 'Limit', 'Attach. Point', 'Line Size', 'Premium', 'CCY', 'Status', ''].map((h) => (
                <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {layers.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No layers yet</td></tr>
            )}
            {layers.map((l) => (
              <>
                <tr key={l.id}>
                  <td className="px-3 py-2 text-gray-500">{l.layerNo}</td>
                  <td className="px-3 py-2 capitalize">{l.layerType}</td>
                  <td className="px-3 py-2">{l.limit.toLocaleString()}</td>
                  <td className="px-3 py-2">{l.attachmentPoint.toLocaleString()}</td>
                  <td className="px-3 py-2">{l.lineSize.toLocaleString()}</td>
                  <td className="px-3 py-2">{l.premium.toLocaleString()}</td>
                  <td className="px-3 py-2">{l.currency}</td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{l.status}</span>
                  </td>
                  <td className="px-3 py-2">
                    {currentSubmission.status !== 'bound' && (
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(l.id)} className="text-indigo-600 hover:underline text-xs">Edit</button>
                        <button onClick={() => handleDelete(l.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
                {l.facriPanels.map((p) => (
                  <tr key={p.facriPanelId} className="bg-indigo-50">
                    <td className="px-3 py-1.5 pl-8 text-xs text-indigo-400" colSpan={2}>↳ FacRi</td>
                    <td className="px-3 py-1.5 text-xs text-indigo-700 font-medium" colSpan={2}>{p.reinsurerName}</td>
                    <td className="px-3 py-1.5 text-xs text-indigo-600" colSpan={2}>{p.cededPct}% cession</td>
                    <td className="px-3 py-1.5" colSpan={3}>
                      <span className="px-1.5 py-0.5 rounded text-xs bg-indigo-100 text-indigo-600">{p.status}</span>
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-base font-semibold mb-4">{editId ? 'Edit Layer' : 'Add Layer'}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Layer Type</label>
                <select value={form.layerType} onChange={(e) => setForm((f) => ({ ...f, layerType: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  <option value="primary">Primary</option>
                  <option value="excess">Excess</option>
                </select>
              </div>
              {(['limit', 'attachmentPoint', 'lineSize', 'premium'] as const).map((key) => {
                const label = { limit: 'Limit', attachmentPoint: 'Attachment Point', lineSize: 'Line Size', premium: 'Premium' }[key]
                return (
                  <div key={key}>
                    <label htmlFor={`layer-${key}`} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input id={`layer-${key}`} required type="number" min="0" step="any" value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                  </div>
                )
              })}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <input value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-300 rounded">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
