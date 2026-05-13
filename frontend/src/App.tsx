/**
 * App root — initialises auth session on boot.
 * Wraps the router with QueryClientProvider and Toaster.
 */
import { RouterProvider } from 'react-router-dom'
import { router } from '@/router'
import { useAuth } from '@/hooks/useAuth'

export default function App() {
  // Bootstrap session on mount (tries to restore from cookie)
  useAuth()
  return <RouterProvider router={router} />
}
