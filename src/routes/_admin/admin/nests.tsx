import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ChevronRight, Plus, Pencil, Trash2, Settings2, Download, Upload, ChevronDown } from 'lucide-react'
import {
  getNests,
  getEggs,
  createNest,
  updateNest,
  deleteNest,
  createEgg,
  updateEgg,
  deleteEgg,
  exportEgg,
  importEgg,
  getEggVariables,
  createEggVariable,
  updateEggVariable,
  deleteEggVariable,
  type AdminNest,
  type AdminEgg,
  type PaginatedResponse,
} from '@/lib/api/admin'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { motion, staggerContainer, staggerItem } from '@/components/motion'

export const Route = createFileRoute('/_admin/admin/nests' as any)({
  component: AdminNestsPage,
})

// ── Nest form ────────────────────────────────────────────────────

interface NestFormData {
  name: string
  description: string
}

const emptyNestForm: NestFormData = { name: '', description: '' }

// ── Egg form ─────────────────────────────────────────────────────

interface EggFormData {
  name: string
  description: string
  docker_images: string
  startup: string
  script_install: string
  script_container: string
  script_entry: string
  copy_script_from: number | null
  config_files: string
  config_startup: string
  config_stop: string
  config_logs: string
}

const emptyEggForm: EggFormData = {
  name: '',
  description: '',
  docker_images: '{}',
  startup: '',
  script_install: '',
  script_container: 'alpine:3.4',
  script_entry: 'ash',
  copy_script_from: null,
  config_files: '{}',
  config_startup: '{"done": ""}',
  config_stop: '^C',
  config_logs: '{}',
}

// ── Variable form ────────────────────────────────────────────────

interface VarFormData {
  name: string
  env_variable: string
  default_value: string
  user_viewable: boolean
  user_editable: boolean
  rules: string
}

const emptyVarForm: VarFormData = {
  name: '',
  env_variable: '',
  default_value: '',
  user_viewable: true,
  user_editable: true,
  rules: 'required|string|max:255',
}

// ── Main page ────────────────────────────────────────────────────

function AdminNestsPage() {
  const [nests, setNests] = useState<PaginatedResponse<AdminNest> | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedNest, setExpandedNest] = useState<number | null>(null)
  const [eggs, setEggs] = useState<Record<number, AdminEgg[]>>({})
  const [loadingEggs, setLoadingEggs] = useState<number | null>(null)

  // Nest CRUD state
  const [nestDialogOpen, setNestDialogOpen] = useState(false)
  const [nestForm, setNestForm] = useState<NestFormData>(emptyNestForm)
  const [editingNest, setEditingNest] = useState<AdminNest | null>(null)
  const [nestSubmitting, setNestSubmitting] = useState(false)
  const [deleteNestTarget, setDeleteNestTarget] = useState<AdminNest | null>(null)
  const [nestDeleting, setNestDeleting] = useState(false)

  // Egg CRUD state
  const [eggDialogOpen, setEggDialogOpen] = useState(false)
  const [eggForm, setEggForm] = useState<EggFormData>(emptyEggForm)
  const [editingEgg, setEditingEgg] = useState<{ nestId: number; egg: AdminEgg } | null>(null)
  const [eggNestId, setEggNestId] = useState<number | null>(null)
  const [eggSubmitting, setEggSubmitting] = useState(false)
  const [deleteEggTarget, setDeleteEggTarget] = useState<{ nestId: number; egg: AdminEgg } | null>(null)
  const [eggDeleting, setEggDeleting] = useState(false)

  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importNestId, setImportNestId] = useState<number | null>(null)
  const [importJson, setImportJson] = useState('')
  const [importParsed, setImportParsed] = useState<{ name: string; description: string } | null>(null)
  const [importParseError, setImportParseError] = useState('')
  const [importSubmitting, setImportSubmitting] = useState(false)
  const importFileRef = useRef<HTMLInputElement>(null)

  // Variables state
  const [varsOpen, setVarsOpen] = useState<{ nestId: number; egg: AdminEgg } | null>(null)
  const [variables, setVariables] = useState<any[]>([])
  const [loadingVars, setLoadingVars] = useState(false)
  const [varDialogOpen, setVarDialogOpen] = useState(false)
  const [varForm, setVarForm] = useState<VarFormData>(emptyVarForm)
  const [editingVar, setEditingVar] = useState<any | null>(null)
  const [varSubmitting, setVarSubmitting] = useState(false)
  const [deleteVarTarget, setDeleteVarTarget] = useState<any | null>(null)
  const [varDeleting, setVarDeleting] = useState(false)

  const fetchNests = () => {
    setLoading(true)
    getNests(1)
      .then(setNests)
      .catch(() => toast.error('Failed to load nests'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchNests()
  }, [])

  const toggleNest = async (nestId: number) => {
    if (expandedNest === nestId) {
      setExpandedNest(null)
      return
    }
    setExpandedNest(nestId)
    if (!eggs[nestId]) {
      await loadEggs(nestId)
    }
  }

  const loadEggs = async (nestId: number) => {
    setLoadingEggs(nestId)
    try {
      const res = await getEggs(nestId)
      setEggs((prev) => ({ ...prev, [nestId]: res.data.map((d) => d.attributes) }))
    } catch {
      toast.error('Failed to load eggs')
    } finally {
      setLoadingEggs(null)
    }
  }

  // ── Nest handlers ────────────────────────────────────────────

  const openCreateNest = () => {
    setNestForm(emptyNestForm)
    setEditingNest(null)
    setNestDialogOpen(true)
  }

  const openEditNest = (nest: AdminNest, e: React.MouseEvent) => {
    e.stopPropagation()
    setNestForm({ name: nest.name, description: nest.description || '' })
    setEditingNest(nest)
    setNestDialogOpen(true)
  }

  const handleNestSubmit = async () => {
    setNestSubmitting(true)
    try {
      if (editingNest) {
        await updateNest(editingNest.id, {
          name: nestForm.name,
          description: nestForm.description || undefined,
        })
        toast.success('Nest updated')
      } else {
        await createNest({
          name: nestForm.name,
          description: nestForm.description || undefined,
        })
        toast.success('Nest created')
      }
      setNestDialogOpen(false)
      fetchNests()
    } catch {
      toast.error(editingNest ? 'Failed to update nest' : 'Failed to create nest')
    } finally {
      setNestSubmitting(false)
    }
  }

  const confirmDeleteNest = (nest: AdminNest, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteNestTarget(nest)
  }

  const handleDeleteNest = async () => {
    if (!deleteNestTarget) return
    setNestDeleting(true)
    try {
      await deleteNest(deleteNestTarget.id)
      toast.success('Nest deleted')
      setDeleteNestTarget(null)
      if (expandedNest === deleteNestTarget.id) setExpandedNest(null)
      fetchNests()
    } catch {
      toast.error('Failed to delete nest')
    } finally {
      setNestDeleting(false)
    }
  }

  // ── Egg handlers ─────────────────────────────────────────────

  const openCreateEgg = (nestId: number) => {
    setEggForm(emptyEggForm)
    setEditingEgg(null)
    setEggNestId(nestId)
    setEggDialogOpen(true)
  }

  const openEditEgg = (nestId: number, egg: AdminEgg) => {
    const config = (egg as any).config ?? {}
    const script = (egg as any).script ?? {}
    setEggForm({
      name: egg.name,
      description: egg.description || '',
      docker_images: JSON.stringify(egg.docker_images || {}, null, 2),
      startup: egg.startup || '',
      script_install: egg.script_install ?? script.install ?? '',
      script_container: egg.script_container ?? script.container ?? 'alpine:3.4',
      script_entry: egg.script_entry ?? script.entry ?? 'ash',
      copy_script_from: egg.copy_script_from ?? (egg as any).copy_script_from ?? null,
      config_files: egg.config_files ?? config.files ?? '{}',
      config_startup: egg.config_startup ?? config.startup ?? '{"done": ""}',
      config_stop: egg.config_stop ?? config.stop ?? '^C',
      config_logs: egg.config_logs ?? config.logs ?? '{}',
    })
    setEditingEgg({ nestId, egg })
    setEggNestId(nestId)
    setEggDialogOpen(true)
  }

  const handleEggSubmit = async () => {
    if (!eggNestId) return
    setEggSubmitting(true)
    try {
      const payload: Record<string, any> = {
        name: eggForm.name,
        description: eggForm.description || undefined,
        docker_images: eggForm.docker_images || undefined,
        startup: eggForm.startup || undefined,
        config_files: eggForm.config_files || undefined,
        config_startup: eggForm.config_startup || undefined,
        config_stop: eggForm.config_stop || undefined,
        config_logs: eggForm.config_logs || undefined,
        script_install: eggForm.script_install || undefined,
        script_container: eggForm.script_container || undefined,
        script_entry: eggForm.script_entry || undefined,
        copy_script_from: eggForm.copy_script_from ?? undefined,
      }

      if (editingEgg) {
        await updateEgg(eggNestId, editingEgg.egg.id, payload)
        toast.success('Egg updated')
      } else {
        await createEgg(eggNestId, payload as any)
        toast.success('Egg created')
      }
      setEggDialogOpen(false)
      await loadEggs(eggNestId)
    } catch {
      toast.error(editingEgg ? 'Failed to update egg' : 'Failed to create egg')
    } finally {
      setEggSubmitting(false)
    }
  }

  const confirmDeleteEgg = (nestId: number, egg: AdminEgg) => {
    setDeleteEggTarget({ nestId, egg })
  }

  const handleDeleteEgg = async () => {
    if (!deleteEggTarget) return
    setEggDeleting(true)
    try {
      await deleteEgg(deleteEggTarget.nestId, deleteEggTarget.egg.id)
      toast.success('Egg deleted')
      setDeleteEggTarget(null)
      await loadEggs(deleteEggTarget.nestId)
    } catch {
      toast.error('Failed to delete egg')
    } finally {
      setEggDeleting(false)
    }
  }

  // ── Export / Import handlers ─────────────────────────────────

  const handleExportEgg = async (nestId: number, egg: AdminEgg) => {
    try {
      const data = await exportEgg(nestId, egg.id)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${egg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to export egg')
    }
  }

  const openImportDialog = (nestId: number) => {
    setImportNestId(nestId)
    setImportJson('')
    setImportParsed(null)
    setImportParseError('')
    setImportDialogOpen(true)
  }

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImportJson((ev.target?.result as string) ?? '')
      setImportParsed(null)
      setImportParseError('')
    }
    reader.readAsText(file)
  }

  const handleParseImport = () => {
    try {
      const parsed = JSON.parse(importJson)
      if (!parsed.name) {
        setImportParseError('JSON is missing required "name" field.')
        setImportParsed(null)
        return
      }
      setImportParsed({ name: parsed.name, description: parsed.description ?? '' })
      setImportParseError('')
    } catch {
      setImportParseError('Invalid JSON. Please check the format.')
      setImportParsed(null)
    }
  }

  const handleImportSubmit = async () => {
    if (!importNestId) return
    setImportSubmitting(true)
    try {
      const parsed = JSON.parse(importJson)
      await importEgg(importNestId, parsed)
      toast.success('Egg imported successfully')
      setImportDialogOpen(false)
      await loadEggs(importNestId)
    } catch {
      toast.error('Failed to import egg')
    } finally {
      setImportSubmitting(false)
    }
  }

  // ── Variable handlers ────────────────────────────────────────

  const openVariables = async (nestId: number, egg: AdminEgg) => {
    setVarsOpen({ nestId, egg })
    setLoadingVars(true)
    try {
      const res = await getEggVariables(nestId, egg.id)
      setVariables(res.data.map((d: any) => d.attributes))
    } catch {
      toast.error('Failed to load variables')
      setVariables([])
    } finally {
      setLoadingVars(false)
    }
  }

  const openCreateVar = () => {
    setVarForm(emptyVarForm)
    setEditingVar(null)
    setVarDialogOpen(true)
  }

  const openEditVar = (v: any) => {
    setVarForm({
      name: v.name || '',
      env_variable: v.env_variable || '',
      default_value: v.default_value || '',
      user_viewable: v.user_viewable ?? true,
      user_editable: v.user_editable ?? true,
      rules: v.rules || '',
    })
    setEditingVar(v)
    setVarDialogOpen(true)
  }

  const handleVarSubmit = async () => {
    if (!varsOpen) return
    setVarSubmitting(true)
    try {
      const payload = {
        name: varForm.name,
        env_variable: varForm.env_variable,
        default_value: varForm.default_value,
        user_viewable: varForm.user_viewable,
        user_editable: varForm.user_editable,
        rules: varForm.rules,
      }
      if (editingVar) {
        await updateEggVariable(varsOpen.nestId, varsOpen.egg.id, editingVar.id, payload)
        toast.success('Variable updated')
      } else {
        await createEggVariable(varsOpen.nestId, varsOpen.egg.id, payload)
        toast.success('Variable created')
      }
      setVarDialogOpen(false)
      // Reload variables
      const res = await getEggVariables(varsOpen.nestId, varsOpen.egg.id)
      setVariables(res.data.map((d: any) => d.attributes))
    } catch {
      toast.error(editingVar ? 'Failed to update variable' : 'Failed to create variable')
    } finally {
      setVarSubmitting(false)
    }
  }

  const confirmDeleteVar = (v: any) => {
    setDeleteVarTarget(v)
  }

  const handleDeleteVar = async () => {
    if (!deleteVarTarget || !varsOpen) return
    setVarDeleting(true)
    try {
      await deleteEggVariable(varsOpen.nestId, varsOpen.egg.id, deleteVarTarget.id)
      toast.success('Variable deleted')
      setDeleteVarTarget(null)
      const res = await getEggVariables(varsOpen.nestId, varsOpen.egg.id)
      setVariables(res.data.map((d: any) => d.attributes))
    } catch {
      toast.error('Failed to delete variable')
    } finally {
      setVarDeleting(false)
    }
  }

  const nestItems = nests?.data.map((d) => d.attributes) ?? []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Nests</h1>
          <p className="text-sm text-zinc-500 mt-1">Service configurations and their egg definitions.</p>
        </div>
        <Button onClick={openCreateNest}>
          <Plus className="w-4 h-4 mr-1" />
          Create Nest
        </Button>
      </div>

      {loading ? (
        <div className="border border-white/[0.08] rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08] hover:bg-transparent">
                <TableHead className="text-zinc-400 w-10" />
                <TableHead className="text-zinc-400">ID</TableHead>
                <TableHead className="text-zinc-400">Name</TableHead>
                <TableHead className="text-zinc-400">Author</TableHead>
                <TableHead className="text-zinc-400">Description</TableHead>
                <TableHead className="text-zinc-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="border-white/[0.08]">
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : nestItems.length === 0 ? (
        <div className="text-zinc-400 py-12 text-center">No nests found.</div>
      ) : (
        <div className="border border-white/[0.08] rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08] hover:bg-transparent">
                <TableHead className="text-zinc-400 w-10" />
                <TableHead className="text-zinc-400">ID</TableHead>
                <TableHead className="text-zinc-400">Name</TableHead>
                <TableHead className="text-zinc-400">Author</TableHead>
                <TableHead className="text-zinc-400">Description</TableHead>
                <TableHead className="text-zinc-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <motion.tbody variants={staggerContainer} initial="hidden" animate="show">
              {nestItems.map((nest, i) => (
                <NestRow
                  key={nest.id}
                  nest={nest}
                  index={i}
                  expanded={expandedNest === nest.id}
                  eggs={eggs[nest.id]}
                  loadingEggs={loadingEggs === nest.id}
                  onToggle={() => toggleNest(nest.id)}
                  onEdit={(e) => openEditNest(nest, e)}
                  onDelete={(e) => confirmDeleteNest(nest, e)}
                  onCreateEgg={() => openCreateEgg(nest.id)}
                  onEditEgg={(egg) => openEditEgg(nest.id, egg)}
                  onDeleteEgg={(egg) => confirmDeleteEgg(nest.id, egg)}
                  onExportEgg={(egg) => handleExportEgg(nest.id, egg)}
                  onImportEgg={() => openImportDialog(nest.id)}
                  onManageVars={(egg) => openVariables(nest.id, egg)}
                />
              ))}
            </motion.tbody>
          </Table>
        </div>
      )}

      {/* Create / Edit Nest Dialog */}
      <Dialog open={nestDialogOpen} onOpenChange={setNestDialogOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle>{editingNest ? 'Edit Nest' : 'Create Nest'}</DialogTitle>
            <DialogDescription>
              {editingNest ? 'Update this nest configuration.' : 'Create a new service nest.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={nestForm.name}
                onChange={(e) => setNestForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nest name"
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input
                value={nestForm.description}
                onChange={(e) => setNestForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNestDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleNestSubmit} disabled={nestSubmitting || !nestForm.name}>
              {nestSubmitting ? 'Saving...' : editingNest ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Nest Confirmation */}
      <Dialog open={!!deleteNestTarget} onOpenChange={(open) => !open && setDeleteNestTarget(null)}>
        <DialogContent className="bg-[#0a0a0a] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle>Delete Nest</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            Are you sure you want to delete <span className="text-white font-medium">{deleteNestTarget?.name}</span>?
            All eggs in this nest will also be deleted. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteNestTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteNest} disabled={nestDeleting}>
              {nestDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Egg Dialog */}
      <Dialog open={eggDialogOpen} onOpenChange={setEggDialogOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/[0.08] max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEgg ? 'Edit Egg' : 'Create Egg'}</DialogTitle>
            <DialogDescription>
              {editingEgg ? 'Update this egg configuration.' : 'Define a new egg for this nest.'}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="configuration" className="w-full">
            <TabsList variant="line" className="mb-4">
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
              <TabsTrigger value="install-script">Install Script</TabsTrigger>
            </TabsList>

            <TabsContent value="configuration">
              <div className="space-y-4 py-2">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input
                    value={eggForm.name}
                    onChange={(e) => setEggForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Egg name"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Input
                    value={eggForm.description}
                    onChange={(e) => setEggForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Optional description"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Docker Images (JSON)</Label>
                  <Textarea
                    value={eggForm.docker_images}
                    onChange={(e) => setEggForm((f) => ({ ...f, docker_images: e.target.value }))}
                    placeholder='{"ghcr.io/image:latest": "ghcr.io/image:latest"}'
                    rows={3}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Startup Command</Label>
                  <Input
                    value={eggForm.startup}
                    onChange={(e) => setEggForm((f) => ({ ...f, startup: e.target.value }))}
                    placeholder="java -jar server.jar"
                  />
                </div>
                <EggConfigSection eggForm={eggForm} setEggForm={setEggForm} />
              </div>
            </TabsContent>

            <TabsContent value="install-script">
              <div className="space-y-4 py-2">
                {eggNestId && eggs[eggNestId] && eggs[eggNestId].length > 0 && (
                  <div className="space-y-1">
                    <Label>Copy Script From</Label>
                    <Select
                      value={String(eggForm.copy_script_from ?? '')}
                      onValueChange={(v) => {
                        if (v === '_none') {
                          setEggForm((f) => ({ ...f, copy_script_from: null }))
                          return
                        }
                        const sourceEggId = Number(v)
                        setEggForm((f) => ({ ...f, copy_script_from: sourceEggId }))
                        const sourceEgg = eggs[eggNestId!]?.find((e) => e.id === sourceEggId)
                        if (sourceEgg) {
                          const script = (sourceEgg as any).script ?? {}
                          setEggForm((f) => ({
                            ...f,
                            copy_script_from: sourceEggId,
                            script_install: sourceEgg.script_install ?? script.install ?? f.script_install,
                            script_container: sourceEgg.script_container ?? script.container ?? f.script_container,
                            script_entry: sourceEgg.script_entry ?? script.entry ?? f.script_entry,
                          }))
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="None (use custom script)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">None (use custom script)</SelectItem>
                        {eggs[eggNestId]
                          .filter((e) => !editingEgg || e.id !== editingEgg.egg.id)
                          .map((e) => (
                            <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-zinc-500">
                      Selecting an egg will copy its install script, container, and entrypoint into the fields below.
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <Label>Install Script</Label>
                  <Textarea
                    value={eggForm.script_install}
                    onChange={(e) => setEggForm((f) => ({ ...f, script_install: e.target.value }))}
                    placeholder={"#!/bin/ash\n# Install script..."}
                    rows={10}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-zinc-500">
                    This script is run inside the install container to set up the server.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Script Container</Label>
                    <Input
                      value={eggForm.script_container}
                      onChange={(e) => setEggForm((f) => ({ ...f, script_container: e.target.value }))}
                      placeholder="alpine:3.4"
                    />
                    <p className="text-xs text-zinc-500">Docker image to run the install script in.</p>
                  </div>
                  <div className="space-y-1">
                    <Label>Script Entrypoint</Label>
                    <Input
                      value={eggForm.script_entry}
                      onChange={(e) => setEggForm((f) => ({ ...f, script_entry: e.target.value }))}
                      placeholder="ash"
                    />
                    <p className="text-xs text-zinc-500">Command entrypoint for the script container.</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEggDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEggSubmit} disabled={eggSubmitting || !eggForm.name}>
              {eggSubmitting ? 'Saving...' : editingEgg ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Egg Confirmation */}
      <Dialog open={!!deleteEggTarget} onOpenChange={(open) => !open && setDeleteEggTarget(null)}>
        <DialogContent className="bg-[#0a0a0a] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle>Delete Egg</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            Are you sure you want to delete <span className="text-white font-medium">{deleteEggTarget?.egg.name}</span>?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteEggTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteEgg} disabled={eggDeleting}>
              {eggDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Egg Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/[0.08] max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Egg</DialogTitle>
            <DialogDescription>
              Paste egg JSON or upload a .json file to import an egg into this nest.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => importFileRef.current?.click()}
              >
                <Upload className="w-3 h-3 mr-1" />
                Upload File
              </Button>
              <span className="text-xs text-zinc-500">or paste JSON below</span>
              <input
                ref={importFileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImportFileChange}
              />
            </div>
            <div className="space-y-1">
              <Textarea
                value={importJson}
                onChange={(e) => {
                  setImportJson(e.target.value)
                  setImportParsed(null)
                  setImportParseError('')
                }}
                placeholder='{"name": "My Egg", "startup": "...", ...}'
                rows={8}
                className="font-mono text-xs"
              />
            </div>
            {importParseError && (
              <p className="text-xs text-red-400">{importParseError}</p>
            )}
            {importParsed && (
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 space-y-1">
                <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Preview</p>
                <p className="text-sm text-white font-medium">{importParsed.name}</p>
                {importParsed.description && (
                  <p className="text-xs text-zinc-400">{importParsed.description}</p>
                )}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleParseImport}
              disabled={!importJson.trim()}
            >
              Parse
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleImportSubmit}
              disabled={importSubmitting || !importParsed}
            >
              {importSubmitting ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variables Panel Dialog */}
      <Dialog open={!!varsOpen} onOpenChange={(open) => { if (!open) setVarsOpen(null) }}>
        <DialogContent className="bg-[#0a0a0a] border-white/[0.08] max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Variables - {varsOpen?.egg.name}</DialogTitle>
            <DialogDescription>Manage environment variables for this egg.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Variables</span>
              <Button size="sm" onClick={openCreateVar}>
                <Plus className="w-3 h-3 mr-1" />
                Add Variable
              </Button>
            </div>
            {loadingVars ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-4 items-center py-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : variables.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4 text-center">No variables defined.</p>
            ) : (
              <div className="border border-white/[0.06] rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-zinc-500 text-xs">Name</TableHead>
                      <TableHead className="text-zinc-500 text-xs">Env Variable</TableHead>
                      <TableHead className="text-zinc-500 text-xs">Default</TableHead>
                      <TableHead className="text-zinc-500 text-xs">Viewable</TableHead>
                      <TableHead className="text-zinc-500 text-xs">Editable</TableHead>
                      <TableHead className="text-zinc-500 text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variables.map((v) => (
                      <TableRow key={v.id} className="border-white/[0.06]">
                        <TableCell className="text-white text-sm font-medium">{v.name}</TableCell>
                        <TableCell className="font-mono text-xs text-zinc-400">{v.env_variable}</TableCell>
                        <TableCell className="text-zinc-400 text-xs max-w-[120px] truncate">{v.default_value || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={v.user_viewable ? 'default' : 'outline'} className="text-[10px]">
                            {v.user_viewable ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={v.user_editable ? 'default' : 'outline'} className="text-[10px]">
                            {v.user_editable ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="xs" onClick={() => openEditVar(v)}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              className="text-red-400 hover:text-red-300"
                              onClick={() => confirmDeleteVar(v)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVarsOpen(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Variable Dialog */}
      <Dialog open={varDialogOpen} onOpenChange={setVarDialogOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle>{editingVar ? 'Edit Variable' : 'Create Variable'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={varForm.name}
                onChange={(e) => setVarForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Server Port"
              />
            </div>
            <div className="space-y-1">
              <Label>Environment Variable</Label>
              <Input
                value={varForm.env_variable}
                onChange={(e) => setVarForm((f) => ({ ...f, env_variable: e.target.value }))}
                placeholder="SERVER_PORT"
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label>Default Value</Label>
              <Input
                value={varForm.default_value}
                onChange={(e) => setVarForm((f) => ({ ...f, default_value: e.target.value }))}
                placeholder="25565"
              />
            </div>
            <div className="space-y-1">
              <Label>Validation Rules</Label>
              <Input
                value={varForm.rules}
                onChange={(e) => setVarForm((f) => ({ ...f, rules: e.target.value }))}
                placeholder="required|string|max:255"
                className="font-mono text-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>User Viewable</Label>
              <Switch
                checked={varForm.user_viewable}
                onCheckedChange={(checked: boolean) => setVarForm((f) => ({ ...f, user_viewable: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>User Editable</Label>
              <Switch
                checked={varForm.user_editable}
                onCheckedChange={(checked: boolean) => setVarForm((f) => ({ ...f, user_editable: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVarDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleVarSubmit} disabled={varSubmitting || !varForm.name || !varForm.env_variable}>
              {varSubmitting ? 'Saving...' : editingVar ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Variable Confirmation */}
      <Dialog open={!!deleteVarTarget} onOpenChange={(open) => !open && setDeleteVarTarget(null)}>
        <DialogContent className="bg-[#0a0a0a] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle>Delete Variable</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            Are you sure you want to delete <span className="text-white font-medium">{deleteVarTarget?.name}</span> ({deleteVarTarget?.env_variable})?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteVarTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteVar} disabled={varDeleting}>
              {varDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Nest Row component ───────────────────────────────────────────

function NestRow({
  nest,
  index,
  expanded,
  eggs,
  loadingEggs,
  onToggle,
  onEdit,
  onDelete,
  onCreateEgg,
  onEditEgg,
  onDeleteEgg,
  onExportEgg,
  onImportEgg,
  onManageVars,
}: {
  nest: AdminNest
  index: number
  expanded: boolean
  eggs?: AdminEgg[]
  loadingEggs: boolean
  onToggle: () => void
  onEdit: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
  onCreateEgg: () => void
  onEditEgg: (egg: AdminEgg) => void
  onDeleteEgg: (egg: AdminEgg) => void
  onExportEgg: (egg: AdminEgg) => void
  onImportEgg: () => void
  onManageVars: (egg: AdminEgg) => void
}) {
  return (
    <>
      <motion.tr
        variants={staggerItem}
        custom={index}
        className="border-b border-white/[0.08] hover:bg-white/[0.03] transition-colors duration-150 cursor-pointer"
        onClick={onToggle}
      >
        <TableCell className="w-10">
          <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
        </TableCell>
        <TableCell className="font-mono text-zinc-300">{nest.id}</TableCell>
        <TableCell className="text-white font-medium">{nest.name}</TableCell>
        <TableCell>
          <Badge variant="secondary" className="text-[10px]">{nest.author}</Badge>
        </TableCell>
        <TableCell className="text-zinc-400 max-w-xs truncate">{nest.description || '-'}</TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="xs" onClick={onEdit}>
              <Pencil className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="text-red-400 hover:text-red-300"
              onClick={onDelete}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </TableCell>
      </motion.tr>

      {expanded && (
        <tr className="border-b border-white/[0.08]">
          <td colSpan={6} className="p-0" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white/[0.02] px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Eggs</h4>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={onImportEgg}>
                    <Upload className="w-3 h-3 mr-1" />
                    Import Egg
                  </Button>
                  <Button size="sm" variant="outline" onClick={onCreateEgg}>
                    <Plus className="w-3 h-3 mr-1" />
                    Create Egg
                  </Button>
                </div>
              </div>
              {loadingEggs ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-4 items-center py-2">
                      <Skeleton className="h-4 w-8" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  ))}
                </div>
              ) : !eggs || eggs.length === 0 ? (
                <p className="text-sm text-zinc-500 py-2">No eggs in this nest.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-zinc-500 text-xs">ID</TableHead>
                      <TableHead className="text-zinc-500 text-xs">Name</TableHead>
                      <TableHead className="text-zinc-500 text-xs">Author</TableHead>
                      <TableHead className="text-zinc-500 text-xs">Docker Image</TableHead>
                      <TableHead className="text-zinc-500 text-xs">Description</TableHead>
                      <TableHead className="text-zinc-500 text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <motion.tbody variants={staggerContainer} initial="hidden" animate="show">
                    {eggs.map((egg, ei) => (
                      <motion.tr
                        key={egg.id}
                        variants={staggerItem}
                        custom={ei}
                        className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02] transition-colors"
                      >
                        <TableCell className="font-mono text-zinc-400 text-sm">{egg.id}</TableCell>
                        <TableCell className="text-white font-medium text-sm">{egg.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{egg.author}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-zinc-400 max-w-[200px] truncate">
                          {egg.docker_image}
                        </TableCell>
                        <TableCell className="text-zinc-500 text-xs max-w-xs truncate">
                          {egg.description || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="xs" onClick={() => onManageVars(egg)} title="Variables">
                              <Settings2 className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="xs" onClick={() => onExportEgg(egg)} title="Export">
                              <Download className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="xs" onClick={() => onEditEgg(egg)}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              className="text-red-400 hover:text-red-300"
                              onClick={() => onDeleteEgg(egg)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </Table>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Egg Configuration collapsible section ────────────────────────

function EggConfigSection({
  eggForm,
  setEggForm,
}: {
  eggForm: EggFormData
  setEggForm: React.Dispatch<React.SetStateAction<EggFormData>>
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-white/[0.08] rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-white/[0.03] transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span>Configuration</span>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.08]">
          <div className="space-y-1 pt-3">
            <Label className="text-xs text-zinc-400">Config Files (JSON)</Label>
            <Textarea
              value={eggForm.config_files}
              onChange={(e) => setEggForm((f) => ({ ...f, config_files: e.target.value }))}
              placeholder='{}'
              rows={3}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">Config Startup (JSON)</Label>
            <Textarea
              value={eggForm.config_startup}
              onChange={(e) => setEggForm((f) => ({ ...f, config_startup: e.target.value }))}
              placeholder='{"done": "Server started"}'
              rows={2}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">Stop Command</Label>
            <Input
              value={eggForm.config_stop}
              onChange={(e) => setEggForm((f) => ({ ...f, config_stop: e.target.value }))}
              placeholder="^C"
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">Config Logs (JSON)</Label>
            <Textarea
              value={eggForm.config_logs}
              onChange={(e) => setEggForm((f) => ({ ...f, config_logs: e.target.value }))}
              placeholder='{}'
              rows={2}
              className="font-mono text-xs"
            />
          </div>
        </div>
      )}
    </div>
  )
}
