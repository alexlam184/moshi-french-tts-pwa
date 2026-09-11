import type { SVGProps } from 'react'

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: 'play'|'pause'|'stop'|'back'|'forward'|'chevron'|'download'|'trash'|'settings'|'speaker' }) {
  const paths: Record<string, React.ReactNode> = {
    play: <path d="m9 7 8 5-8 5V7Z" fill="currentColor"/>,
    pause: <><path d="M9 7h2v10H9zM14 7h2v10h-2z" fill="currentColor"/></>,
    stop: <rect x="8" y="8" width="8" height="8" rx="1" fill="currentColor"/>,
    back: <path d="m16 7-7 5 7 5V7ZM7 7h2v10H7z" fill="currentColor"/>,
    forward: <path d="m8 7 7 5-7 5V7Zm7 0h2v10h-2z" fill="currentColor"/>,
    chevron: <path d="m8 10 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>,
    download: <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>,
    trash: <path d="M8 8v10m4-10v10m4-10v10M5 6h14M9 6V4h6v2M7 6l1 14h8l1-14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>,
    settings: <><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6"/><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></>,
    speaker: <><path d="M5 10v4h3l4 3V7L8 10H5Z" fill="currentColor"/><path d="M15 9.5a4 4 0 0 1 0 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>{paths[name]}</svg>
}
