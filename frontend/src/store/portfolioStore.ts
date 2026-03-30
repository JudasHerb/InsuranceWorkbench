import { create } from 'zustand'
import type { PortfolioSnapshot, PortfolioUpdatedPayload } from '../types'

interface PortfolioFilters {
  territory: string
  lineOfBusiness: string
  status: string
}

interface PortfolioState {
  snapshot: PortfolioSnapshot | null
  filters: PortfolioFilters
  selectedSubmissionIds: string[]
  isLoading: boolean

  setSnapshot: (snapshot: PortfolioSnapshot) => void
  applyPortfolioUpdated: (payload: PortfolioUpdatedPayload) => void
  setFilter: (key: keyof PortfolioFilters, value: string) => void
  clearFilters: () => void
  toggleSubmissionSelection: (id: string) => void
  clearSelection: () => void
  setLoading: (loading: boolean) => void
}

const defaultFilters: PortfolioFilters = {
  territory: '',
  lineOfBusiness: '',
  status: '',
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  snapshot: null,
  filters: defaultFilters,
  selectedSubmissionIds: [],
  isLoading: false,

  setSnapshot: (snapshot) => set({ snapshot }),

  applyPortfolioUpdated: (payload) =>
    set((state) => {
      if (!state.snapshot) return {}
      return {
        snapshot: {
          ...state.snapshot,
          id: payload.snapshotId,
          generatedAt: payload.generatedAt,
          kpis: {
            ...state.snapshot.kpis,
            totalGWP: payload.kpis.totalGWP,
            aggregateLimit: payload.kpis.aggregateLimit,
            largestSingleRisk: payload.kpis.largestSingleRisk,
            ytdLossRatio: payload.kpis.ytdLossRatio,
          },
        },
      }
    }),

  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),

  clearFilters: () => set({ filters: defaultFilters }),

  toggleSubmissionSelection: (id) =>
    set((state) => ({
      selectedSubmissionIds: state.selectedSubmissionIds.includes(id)
        ? state.selectedSubmissionIds.filter((s) => s !== id)
        : [...state.selectedSubmissionIds, id],
    })),

  clearSelection: () => set({ selectedSubmissionIds: [] }),

  setLoading: (isLoading) => set({ isLoading }),
}))
