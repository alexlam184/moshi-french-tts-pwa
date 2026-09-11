import { useEffect, useState } from 'react'
import { estimateStorage, installedModels, installModel, MODEL_CATALOG, uninstallModel, type ModelDefinition } from '../services/models'
import { Icon } from './Icons'

export function ModelManager({ open, onClose, onInstalledChange }: { open: boolean; onClose: () => void; onInstalledChange: (ids: string[]) => void }) {
  const [models, setModels] = useState<ModelDefinition[]>(MODEL_CATALOG)
  const [storage, setStorage] = useState({ usage: 0, quota: 0 })
  const [installErrors, setInstallErrors] = useState<Record<string, string>>({})

  const refreshStorage = () => estimateStorage().then(s => setStorage({ usage: s.usage ?? 0, quota: s.quota ?? 0 }))
  useEffect(() => { installedModels().then(ids => { setModels(m => m.map(x => ids.includes(x.id) ? { ...x, state: 'installed' } : x)); onInstalledChange(ids) }); refreshStorage() }, [onInstalledChange])
  useEffect(() => { const dialog = document.getElementById('models-dialog') as HTMLDialogElement | null; if (open && dialog && !dialog.open) dialog.showModal(); if (!open && dialog?.open) dialog.close() }, [open])

  async function install(model: ModelDefinition) {
    setInstallErrors(errors => ({ ...errors, [model.id]: '' }))
    setModels(items => items.map(x => x.id === model.id ? { ...x, state: 'installing', progress: 4 } : x))
    try {
      await installModel(model.id, progress => setModels(items => items.map(x => x.id === model.id ? { ...x, progress } : x)))
      setModels(items => items.map(x => x.id === model.id ? { ...x, state: 'installed', progress: 100 } : x))
      onInstalledChange(await installedModels())
      refreshStorage()
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'The download could not finish. Check your connection and browser storage, then retry.'
      setInstallErrors(errors => ({ ...errors, [model.id]: reason }))
      setModels(items => items.map(x => x.id === model.id ? { ...x, state: 'error', progress: 0 } : x))
    }
  }

  async function remove(id: string) { await uninstallModel(id); setModels(items => items.map(x => x.id === id ? { ...x, state: 'available', progress: 0 } : x)); onInstalledChange(await installedModels()); refreshStorage() }
  const mb = (storage.usage / 1024 / 1024).toFixed(1)

  return <dialog id="models-dialog" className="dialog" onClose={onClose} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
    <div className="dialog__body">
      <header className="dialog__header"><div><p className="eyebrow">MODEL STORAGE</p><h2>offline voices</h2></div><button className="icon-button" onClick={onClose} aria-label="Close model manager">×</button></header>
      <p className="dialog__lede">model packages stay in this browser. install a voice once, then use it locally for private, offline playback.</p>
      <div className="model-list">
        {models.map(model => <article className="model" key={model.id}>
          <div className="model__copy"><strong>{model.name}</strong><span>{model.detail}</span><small>{model.size} MB package</small>{installErrors[model.id] && <small className="model__error" role="alert">{installErrors[model.id]}</small>}</div>
          {model.state === 'installing' ? <div className="model__progress"><span>{Math.round(model.progress)}%</span><progress value={model.progress} max="100" /></div> : model.state === 'installed' ? <button className="button button--quiet button--danger" onClick={() => remove(model.id)}><Icon name="trash"/> uninstall</button> : <button className="button button--quiet" data-state={model.state} onClick={() => install(model)}><Icon name="download"/> {model.state === 'error' ? 'retry' : 'install'}</button>}
        </article>)}
      </div>
      <footer className="storage"><span>browser storage used</span><strong>{mb} MB</strong></footer>
    </div>
  </dialog>
}
