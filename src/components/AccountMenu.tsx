import { CaretDown, Gear, SignOut, UserCircle } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'

/** Top-right account menu: settings + sign out. Available everywhere, not just Home. */
export function AccountMenu() {
  const { session, signOut } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-9 cursor-pointer items-center gap-1 rounded-full px-2 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <UserCircle size={22} weight="fill" aria-hidden="true" />
        <CaretDown size={12} weight="bold" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-30 w-56 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          {session?.user?.email && (
            <p className="truncate border-b border-border px-3.5 py-2 text-xs text-muted-foreground">
              {session.user.email}
            </p>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              router.push('/account')
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-3.5 py-2.5 text-left text-sm text-card-foreground hover:bg-muted"
          >
            <Gear size={16} weight="bold" aria-hidden="true" />
            Account Settings
          </button>
          {session?.user && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                signOut()
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-3.5 py-2.5 text-left text-sm text-destructive hover:bg-muted"
            >
              <SignOut size={16} weight="bold" aria-hidden="true" />
              Sign Out
            </button>
          )}
        </div>
      )}
    </div>
  )
}
