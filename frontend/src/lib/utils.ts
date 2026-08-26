import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string) {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

export function formatTime(dateStr: string) {
  try {
    return format(parseISO(dateStr), 'h:mm a')
  } catch {
    return '—'
  }
}

export function formatDatetime(dateStr: string) {
  try {
    return format(parseISO(dateStr), 'MMM d, h:mm a')
  } catch {
    return '—'
  }
}

export function today() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function pct(value: number) {
  return `${value.toFixed(1)}%`
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
