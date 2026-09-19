import { CheckCircle, CircleNotch, UploadSimple } from '@phosphor-icons/react'
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
}

export function UploadDropzone({
  label,
  helperText,
  accept,
  fileName,
  status = 'idle',
  workingText = 'Processing…',
  onFile,
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
      <p id={`${inputId}-helper`} className="mt-1.5 text-xs text-muted-foreground">
        {helperText}
      </p>
    </div>
  )
}
