import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { aiApi } from '../api'

export function useGenerateReport(offerId: number) {
  return useMutation({
    mutationFn: () => aiApi.generateReport(offerId),

    onSuccess: (res) => {
      // Trigger browser download from blob
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `debrief_report_${offerId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Report downloaded successfully.')
    },

    onError: (err: unknown) => {
      const errorData = (err as { response?: { data?: { error?: { message?: string; hint?: string } } } })
        ?.response?.data?.error

      const msg  = errorData?.message ?? 'Failed to generate report.'
      const hint = errorData?.hint

      // Show primary error message, then hint as a follow-up toast if present
      toast.error(msg, { duration: 5000 })
      if (hint) {
        setTimeout(() => toast(hint, { icon: 'ℹ️', duration: 6000 }), 500)
      }
    },
  })
}
