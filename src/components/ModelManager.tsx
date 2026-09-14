import { useCallback, useEffect, useState } from 'react'
import { installedModels, installModel, MODEL_CATALOG, modelStorageUsage, uninstallModel, type ModelDefinition } from '../services/models'
import { Icon } from './Icons'

type BrowserStorage = { usage: number; quota: number }

function formatStorageSize(bytes: number) {
  const mb = bytes / 1_000_000
  return mb >= 1_000 ? `${(mb / 1_000).toLocaleString('en', { maximumFractionDigits: 1 })} GB` : `${mb.toLocaleString('en', { maximumFractionDigits: 1 })} MB`
}

export function ModelManager({ open, onClose, onInstalledChange }: { open: boolean; onClose: () => void; onInstalledChange: (ids: string[]) => void }) {
  const [models, setModels] = useState<ModelDefinition[]>(MODEL_CATALOG)
  const [storage, setStorage] = useState(0)
  const [browserStorage, setBrowserStorage] = useState<BrowserStorage | null>(null)
  const [installErrors, setInstallErrors] = useState<Record<string, string>>({})
  const installing = models.some(model => model.state === 'installing')

  const refreshBrowserStorage = useCallback(async () => {
    try {
      const estimate = await navigator.storage?.estimate?.()
      setBrowserStorage(typeof estimate?.usage === 'number' && typeof estimate.quota === 'number'
        ? { usage: estimate.usage, quota: estimate.quota }
        : null)
    } catch { setBrowserStorage(null) }
  }, [])
  const refreshStorage = useCallback(async () => {
    await Promise.all([modelStorageUsage().then(setStorage).catch(() => {}), refreshBrowserStorage()])
  }, [refreshBrowserStorage])
  useEffect(() => { installedModels().then(ids => { setModels(m => m.map(x => ids.includes(x.id) ? { ...x, state: 'installed' } : x)); onInstalledChange(ids) }); void refreshStorage() }, [onInstalledChange, refreshStorage])
  useEffect(() => {
    const dialog = document.getElementById('models-dialog') as HTMLDialogElement | null
    if (open && dialog && !dialog.open) { dialog.showModal(); void refreshStorage() }
    if (!open && dialog?.open) dialog.close()
  }, [open, refreshStorage])
  useEffect(() => {
    if (!open || !installing) return
    const interval = window.setInterval(() => { void refreshBrowserStorage() }, 5000)
    return () => window.clearInterval(interval)
  }, [open, installing, refreshBrowserStorage])

  async function install(model: ModelDefinition) {
    setInstallErrors(errors => ({ ...errors, [model.id]: '' }))
    setModels(items => items.map(x => x.id === model.id ? { ...x, state: 'installing', progress: 4 } : x))
    try {
      await installModel(model.id, progress => setModels(items => items.map(x => x.id === model.id ? { ...x, progress } : x)))
      setModels(items => items.map(x => x.id === model.id ? { ...x, state: 'installed', progress: 100 } : x))
      onInstalledChange(await installedModels())
      await refreshStorage()
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'The download could not finish. Check your connection and browser storage, then retry.'
      setInstallErrors(errors => ({ ...errors, [model.id]: reason }))
      setModels(items => items.map(x => x.id === model.id ? { ...x, state: 'error', progress: 0 } : x))
      await refreshStorage()
    }
  }

  async function remove(id: string) {
    await uninstallModel(id)
    setInstallErrors(errors => ({ ...errors, [id]: '' }))
    setModels(items => items.map(x => x.id === id ? { ...x, state: 'available', progress: 0 } : x))
    onInstalledChange(await installedModels())
    await refreshStorage()
  }
  const mb = (storage / 1_000_000).toFixed(1)

  return <dialog id="models-dialog" className="dialog model-dialog" onClose={onClose} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
    <div className="dialog__body">
      <header className="dialog__header"><div><p className="eyebrow">MODEL STORAGE</p><h2>offline voices</h2></div><button className="icon-button" onClick={onClose} aria-label="Close model manager">×</button></header>
      <p className="dialog__lede">model packages stay in this browser. install a voice once, then use it locally for private, offline playback.</p>
      <aside className="model-note" aria-label="iPad and iPhone compatibility note">
        <strong>iPad &amp; iPhone note</strong>
        <p>Supertonic HD needs about 401 MB, plus temporary working space. Safari may reject its download or stop playback when browser storage or memory is limited. Piper is recommended for reliable mobile use; Supertonic HD works best on desktop.</p>
      </aside>
      <div className="model-list">
        {models.map(model => <article className="model" key={model.id}>
          <div className="model__copy"><strong>{model.name}</strong><span>{model.detail}</span><small>{model.size} MB package</small>{installErrors[model.id] && <small className="model__error" role="alert">{installErrors[model.id]}</small>}</div>
          {model.state === 'installing' ? <div className="model__progress"><span>{Math.round(model.progress)}%</span><progress value={model.progress} max="100" /></div> : model.state === 'installed' ? <button className="button button--quiet button--danger" onClick={() => remove(model.id)}><Icon name="trash"/> Uninstall</button> : <button className="button button--quiet" data-state={model.state} onClick={() => install(model)}><Icon name="download"/> {model.state === 'error' ? 'Retry' : 'Install'}</button>}
        </article>)}
      </div>
      <footer className="storage-summary">
        <div className="storage"><span>Model storage used</span><strong>{mb} MB</strong></div>
        <div className="storage"><span>Browser storage: used / estimated quota</span><strong>{browserStorage ? `${formatStorageSize(browserStorage.usage)} / ${formatStorageSize(browserStorage.quota)}` : 'Unavailable'}</strong></div>
        {browserStorage && <div className="storage"><span>Estimated remaining</span><strong>{formatStorageSize(Math.max(0, browserStorage.quota - browserStorage.usage))}</strong></div>}
        <p className="storage-summary__note">Browser figures cover this website’s storage, not device memory. They are estimates and can change.</p>
      </footer>
    </div>
  </dialog>
}
