import { useState, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from './button'

interface ConfirmDialogProps {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'destructive' | 'default'
  onConfirm: () => void
  children: (open: () => void) => ReactNode
}

export function ConfirmDialog({
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {children(() => setIsOpen(true))}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-sm rounded-[20px] border bg-card p-6 shadow-lg">
            <div className="flex gap-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${variant === 'destructive' ? 'bg-destructive/10' : 'bg-brand-50'}`}>
                <AlertTriangle className={`h-5 w-5 ${variant === 'destructive' ? 'text-destructive' : 'text-brand-500'}`} />
              </div>
              <div>
                <h3 className="text-sm font-bold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{message}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                {cancelLabel}
              </Button>
              <Button
                variant={variant}
                size="sm"
                onClick={() => { setIsOpen(false); onConfirm() }}
              >
                {confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
