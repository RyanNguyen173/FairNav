import { CheckCircle, CircleNotch, Trash, UploadSimple } from '@phosphor-icons/react'
import { useId, useRef, useState, type DragEvent } from 'react'
import type { AsyncStatus } from '../wizard/types'

interface UploadDropzoneProps {
  label: string
  helperText: string
  accept: string
  fileName: string | null
  status?: AsyncStatus
  workingText?: string
  onFile: (file: File) => void
  /** Shows a delete button on the uploaded file when provided. */
  onRemove?: () => void
}

export function UploadDropzone({
  label,
  helperText,
  accept,
  fileName,
  status = 'idle',
  workingText = 'Processing…',
  onFile,
  onRemove,
}: UploadDropzoneProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (file) onFile(file)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  return (
    <div>
      <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-foreground">
        {label}
      </label>
      <div className="relative">
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              inputRef.current?.click()
            }
          }}
          role="button"
          tabIndex={0}
          aria-describedby={`${inputId}-helper`}
          className={[
            'flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center',
            'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isDragging ? 'border-primary bg-primary/10' : 'border-border bg-card',
          ].join(' ')}
        >
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={accept}
            className="sr-only"
            onChange={(event) => handleFiles(event.target.files)}
          />

          {status === 'working' ? (
            <>
              <CircleNotch size={28} weight="bold" className="animate-spin text-primary" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">{workingText}</p>
            </>
          ) : fileName ? (
            <>
              <CheckCircle size={28} weight="fill" className="text-success" aria-hidden="true" />
              <p className="max-w-full truncate text-sm font-medium text-foreground">{fileName}</p>
              <p className="text-xs text-muted-foreground">Tap to replace</p>
            </>
          ) : (
            <>
              <UploadSimple size={28} weight="regular" className="text-primary" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">Drag &amp; drop, or tap to browse</p>
            </>
          )}
        </div>

        {fileName && status !== 'working' && onRemove && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onRemove()
            }}
            aria-label={`Remove ${fileName}`}
            className="absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-card text-muted-foreground shadow-hairline transition-colors duration-150 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Trash size={14} weight="bold" aria-hidden="true" />
          </button>
        )}
      </div>
      <p id={`${inputId}-helper`} className="mt-1.5 text-xs text-muted-foreground">
        {helperText}
      </p>
    </div>
  )
}
