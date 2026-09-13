import type { Sentence } from '../core/text'
import { Icon } from './Icons'

type Props = {
  sentence: Sentence; expanded: boolean; active: boolean; paused: boolean; activeWord: number; hoveredWord: number | null
  audioStatus: string; ipa: string
  onToggle: () => void; onPlay: () => void; onWordClick: (i: number) => void; onWordDoubleClick: (i: number) => void; onWordEnter: (i: number) => void; onWordLeave: () => void
}

export function SentenceRow(props: Props) {
  const { sentence, expanded, active, paused, activeWord, hoveredWord } = props
  const audioStatusClass = props.audioStatus.replaceAll(' ', '-')
  return <article className={`sentence ${active ? 'sentence--active' : ''}`}>
    <div className="sentence__main">
      <button className="icon-button sentence__toggle" onClick={props.onToggle} aria-expanded={expanded} aria-label={`${expanded ? 'Hide' : 'Show'} pronunciation and meaning`}><Icon name="chevron" className={expanded ? 'rotate' : ''}/></button>
      <p className="sentence__text" lang="fr">
        {sentence.words.map((word, i) => <button key={`${word}-${i}`} className={`word ${activeWord === i && hoveredWord === null ? 'word--speaking' : ''} ${hoveredWord === i ? 'word--hovered' : ''}`} onClick={() => props.onWordClick(i)} onDoubleClick={() => props.onWordDoubleClick(i)} onPointerEnter={() => props.onWordEnter(i)} onPointerLeave={props.onWordLeave}>{word}</button>)}
      </p>
      <div className="sentence__audio">
        <span className={`sentence__audio-status sentence__audio-status--${audioStatusClass} ${active ? 'sentence__audio-status--active' : ''}`}><i aria-hidden="true" />{props.audioStatus}</span>
        <button className="play-button" onClick={props.onPlay} aria-label={`${active ? paused ? 'Resume' : 'Pause' : 'Play'} sentence`}><Icon name={active && !paused ? 'pause' : 'play'}/><span>{active ? paused ? 'Resume' : 'Pause' : 'Play'}</span></button>
      </div>
    </div>
    {expanded && <div className="sentence__details"><div><span>IPA · FRENCH (FRANCE)</span><p lang="fr-fonipa" aria-live="polite">{props.ipa}</p></div><div><span>ENGLISH</span><p>{sentence.translation}</p></div></div>}
  </article>
}
