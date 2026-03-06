import { addDays, format, startOfWeek } from 'date-fns'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  type CalendarEvent,
  type EventCategory,
  getEventInstancesForDate,
  getEventInstancesForWeek,
  useScheduleStore,
} from '../store/scheduleStore'
import { useWorkoutStore, type WorkoutTemplate, type WorkoutTemplateExercise } from '../store/workoutStore'

const dayLabelMini = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const dayLabelLong = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const timeTicks = ['08:00', '11:00', '14:00', '17:00']

type RepeatEnds = 'until' | 'forever'

type EventFormState = {
  title: string
  date: string
  startTime: string
  endTime: string
  category: EventCategory
  workoutTemplateId: string
  repeatWeekly: boolean
  repeatEnds: RepeatEnds
  repeatUntil: string
  notes: string
}

type WorkoutExerciseDraft = {
  id: string
  name: string
  plannedSets: string
  plannedReps: string
  weightKg: string
}

type LayoutInstance = ReturnType<typeof getEventInstancesForDate>[number] & {
  lane: number
  laneCount: number
  hardConflict: boolean
}

type DragMode = 'move' | 'resize'

type DragState = {
  eventId: string
  mode: DragMode
}

const eventStyleByCategory: Record<EventCategory, string> = {
  deep: 'border-[#C8A37E]/70 bg-[#C8A37E]/32 text-[#F5E2CC]',
  project: 'border-[#7FA5D8]/70 bg-[#7FA5D8]/30 text-[#DCE8F8]',
  health: 'border-[#7FCB92]/70 bg-[#7FCB92]/30 text-[#DFF6E5]',
  workout: 'border-[#6ED1B6]/70 bg-[#6ED1B6]/30 text-[#D6FAEF]',
  deadline: 'border-[#F3BD7A]/70 bg-[#F3BD7A]/30 text-[#FBE8CF]',
  exam: 'border-[#E5939A]/70 bg-[#E5939A]/30 text-[#FADBE0]',
  other: 'border-white/35 bg-white/15 text-white/85',
}

const legendItems: Array<{ category: EventCategory; label: string }> = [
  { category: 'deep', label: 'Deep Work' },
  { category: 'project', label: 'Project' },
  { category: 'health', label: 'Health' },
  { category: 'workout', label: 'Workout' },
]

const createDefaultForm = (date: string): EventFormState => ({
  title: '',
  date,
  startTime: '08:00',
  endTime: '10:00',
  category: 'deep',
  workoutTemplateId: '',
  repeatWeekly: false,
  repeatEnds: 'forever',
  repeatUntil: date,
  notes: '',
})

const randomId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const createExerciseDraft = (): WorkoutExerciseDraft => ({
  id: randomId(),
  name: '',
  plannedSets: '3',
  plannedReps: '10',
  weightKg: '',
})

const createDraftFromTemplate = (template?: WorkoutTemplate): WorkoutExerciseDraft[] =>
  template && template.exercises.length > 0
    ? template.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        plannedSets: String(exercise.plannedSets),
        plannedReps: String(exercise.plannedReps),
        weightKg: exercise.weightKg ? String(exercise.weightKg) : '',
      }))
    : [createExerciseDraft()]

const parseMinutes = (time: string): number => {
  const [hour, minute] = time.split(':').map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return 0
  }
  return hour * 60 + minute
}

const toTimeLabel = (minutes: number): string => {
  const safe = Math.max(0, Math.min(23 * 60 + 59, minutes))
  const hour = Math.floor(safe / 60)
  const minute = safe % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

const overlaps = (
  left: { startTime: string; endTime: string },
  right: { startTime: string; endTime: string },
): boolean => parseMinutes(left.startTime) < parseMinutes(right.endTime) && parseMinutes(right.startTime) < parseMinutes(left.endTime)

const layoutInstances = (items: ReturnType<typeof getEventInstancesForDate>): LayoutInstance[] => {
  const sorted = [...items].sort((a, b) => parseMinutes(a.startTime) - parseMinutes(b.startTime))
  const laneEndMinutes: number[] = []
  const laneById = new Map<string, number>()

  sorted.forEach((item) => {
    const start = parseMinutes(item.startTime)
    let lane = laneEndMinutes.findIndex((endMinute) => endMinute <= start)
    if (lane === -1) {
      lane = laneEndMinutes.length
      laneEndMinutes.push(parseMinutes(item.endTime))
    } else {
      laneEndMinutes[lane] = parseMinutes(item.endTime)
    }
    laneById.set(item.event.id, lane)
  })

  return sorted.map((item) => {
    const lane = laneById.get(item.event.id) ?? 0
    const collisions = sorted.filter((candidate) => candidate.event.id !== item.event.id && overlaps(item, candidate))
    const laneCount = collisions.length > 0 ? Math.max(...collisions.map((candidate) => (laneById.get(candidate.event.id) ?? 0) + 1), lane + 1) : 1
    const hardConflict = collisions.some((candidate) => candidate.event.category === 'exam' || candidate.event.category === 'deadline')
    return {
      ...item,
      lane,
      laneCount,
      hardConflict,
    }
  })
}

const prettyCategory = (category: EventCategory): string =>
  category === 'project' ? 'Project' : category.charAt(0).toUpperCase() + category.slice(1)

export function SchedulePage() {
  const events = useScheduleStore((state) => state.events)
  const addEvent = useScheduleStore((state) => state.addEvent)
  const updateEvent = useScheduleStore((state) => state.updateEvent)
  const deleteEvent = useScheduleStore((state) => state.deleteEvent)

  const templates = useWorkoutStore((state) => state.templates)
  const addTemplate = useWorkoutStore((state) => state.addTemplate)
  const updateTemplate = useWorkoutStore((state) => state.updateTemplate)
  const deleteTemplate = useWorkoutStore((state) => state.deleteTemplate)

  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), [])
  const weekStartDate = format(weekStart, 'yyyy-MM-dd')
  const weekDates = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, index) => {
        const date = addDays(weekStart, index)
        return {
          date,
          iso: format(date, 'yyyy-MM-dd'),
          shortDate: format(date, 'd MMM'),
          weekday: dayLabelLong[index],
        }
      }),
    [weekStart],
  )

  const [activeDayIndex, setActiveDayIndex] = useState((new Date().getDay() + 6) % 7)
  const [isDrawerOpen, setDrawerOpen] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [formState, setFormState] = useState<EventFormState>(() =>
    createDefaultForm(format(addDays(weekStart, (new Date().getDay() + 6) % 7), 'yyyy-MM-dd')),
  )
  const [formError, setFormError] = useState('')
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [templateNameDraft, setTemplateNameDraft] = useState('')
  const [templateExercisesDraft, setTemplateExercisesDraft] = useState<WorkoutExerciseDraft[]>([createExerciseDraft()])
  const [templateError, setTemplateError] = useState('')
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [dragPreview, setDragPreview] = useState<{ date: string; startTime: string; endTime: string } | null>(null)
  const dayColumnRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const weekInstances = useMemo(() => getEventInstancesForWeek(events, weekStartDate), [events, weekStartDate])
  const templateById = useMemo(() => Object.fromEntries(templates.map((template) => [template.id, template])), [templates])
  const instancesByDate = useMemo(
    () =>
      Object.fromEntries(
        weekDates.map((item) => {
          const dateItems = weekInstances.filter((instance) => instance.date === item.iso)
          return [item.iso, layoutInstances(dateItems)]
        }),
      ) as Record<string, LayoutInstance[]>,
    [weekDates, weekInstances],
  )

  const activeDate = weekDates[activeDayIndex]?.iso ?? weekDates[0].iso
  const activeDayInstances = useMemo(() => getEventInstancesForDate(events, activeDate), [activeDate, events])
  const activeConflictEvents = useMemo(
    () =>
      activeDayInstances.filter((instance) =>
        activeDayInstances.some((candidate) => candidate.event.id !== instance.event.id && overlaps(instance, candidate)),
      ),
    [activeDayInstances],
  )

  const openDrawerForCreate = (date: string) => {
    setEditingEventId(null)
    setFormError('')
    setFormState(createDefaultForm(date))
    setDrawerOpen(true)
  }

  const openDrawerForEdit = (event: CalendarEvent) => {
    setEditingEventId(event.id)
    setFormError('')
    setFormState({
      title: event.title,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      category: event.category,
      workoutTemplateId: event.workoutTemplateId ?? '',
      repeatWeekly: event.repeat !== 'none',
      repeatEnds: event.repeat === 'weekly_until' ? 'until' : 'forever',
      repeatUntil: event.repeatUntil ?? event.date,
      notes: event.notes ?? '',
    })
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setEditingEventId(null)
    setFormError('')
    setTemplateEditorOpen(false)
    setEditingTemplateId(null)
    setTemplateError('')
  }

  const openTemplateEditor = (template?: WorkoutTemplate) => {
    setTemplateEditorOpen(true)
    setEditingTemplateId(template?.id ?? null)
    setTemplateError('')
    setTemplateNameDraft(template?.name ?? '')
    setTemplateExercisesDraft(createDraftFromTemplate(template))
  }

  const normalizeTemplateExercises = (
    exercises: WorkoutExerciseDraft[],
  ): Omit<WorkoutTemplateExercise, 'id'>[] =>
    exercises
      .map((exercise) => ({
        name: exercise.name.trim(),
        plannedSets: Number(exercise.plannedSets),
        plannedReps: Number(exercise.plannedReps),
        weightKg: exercise.weightKg.trim() ? Number(exercise.weightKg) : undefined,
      }))
      .filter((exercise) => exercise.name.length > 0)
      .map((exercise) => ({
        ...exercise,
        plannedSets: Number.isFinite(exercise.plannedSets) && exercise.plannedSets > 0 ? Math.round(exercise.plannedSets) : 3,
        plannedReps: Number.isFinite(exercise.plannedReps) && exercise.plannedReps > 0 ? Math.round(exercise.plannedReps) : 10,
        weightKg: Number.isFinite(exercise.weightKg) ? exercise.weightKg : undefined,
      }))

  const onSaveTemplate = () => {
    const cleanName = templateNameDraft.trim()
    const cleanExercises = normalizeTemplateExercises(templateExercisesDraft)

    if (!cleanName) {
      setTemplateError('Template name is required.')
      return
    }

    if (cleanExercises.length === 0) {
      setTemplateError('Add at least one exercise.')
      return
    }

    if (editingTemplateId) {
      updateTemplate(editingTemplateId, { name: cleanName, exercises: cleanExercises })
      setFormState((state) => ({ ...state, workoutTemplateId: editingTemplateId }))
    } else {
      const templateId = addTemplate({ name: cleanName, exercises: cleanExercises })
      setFormState((state) => ({ ...state, workoutTemplateId: templateId }))
    }

    setTemplateEditorOpen(false)
    setEditingTemplateId(null)
    setTemplateError('')
  }

  const saveEvent = () => {
    if (!formState.title.trim()) {
      setFormError('Event title is required.')
      return
    }

    if (!formState.date) {
      setFormError('Event date is required.')
      return
    }

    if (parseMinutes(formState.endTime) <= parseMinutes(formState.startTime)) {
      setFormError('End time must be after start time.')
      return
    }

    if (formState.category === 'workout' && !formState.workoutTemplateId) {
      setFormError('Select or create a workout template.')
      return
    }

    const repeat = formState.repeatWeekly ? (formState.repeatEnds === 'until' ? 'weekly_until' : 'weekly_forever') : 'none'
    const repeatUntil =
      repeat === 'weekly_until'
        ? formState.repeatUntil && formState.repeatUntil >= formState.date
          ? formState.repeatUntil
          : formState.date
        : null

    const payload = {
      title: formState.title.trim(),
      date: formState.date,
      startTime: formState.startTime,
      endTime: formState.endTime,
      category: formState.category,
      repeat,
      repeatUntil,
      workoutTemplateId: formState.category === 'workout' ? formState.workoutTemplateId || undefined : undefined,
      notes: formState.notes.trim() || undefined,
    } satisfies Omit<CalendarEvent, 'id'>

    if (editingEventId) {
      updateEvent(editingEventId, payload)
    } else {
      addEvent(payload)
    }

    closeDrawer()
  }

  const minMinute = 8 * 60
  const maxMinute = 20 * 60
  const minuteRange = maxMinute - minMinute

  const projectPointerToSlot = (clientX: number, clientY: number) => {
    const targetDay = weekDates.find((item) => {
      const column = dayColumnRefs.current[item.iso]
      if (!column) {
        return false
      }
      const rect = column.getBoundingClientRect()
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
    })
    if (!targetDay) {
      return null
    }
    const column = dayColumnRefs.current[targetDay.iso]
    if (!column) {
      return null
    }
    const rect = column.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    const minuteRaw = minMinute + ratio * minuteRange
    const minuteSnapped = Math.round(minuteRaw / 15) * 15
    return { date: targetDay.iso, minute: Math.max(minMinute, Math.min(maxMinute - 15, minuteSnapped)) }
  }

  useEffect(() => {
    if (!dragState) {
      return
    }
    const sourceEvent = events.find((event) => event.id === dragState.eventId)
    if (!sourceEvent) {
      setDragState(null)
      setDragPreview(null)
      return
    }

    const sourceStart = parseMinutes(sourceEvent.startTime)
    const sourceEnd = parseMinutes(sourceEvent.endTime)
    const sourceDuration = Math.max(30, sourceEnd - sourceStart)

    const onPointerMove = (event: PointerEvent) => {
      const slot = projectPointerToSlot(event.clientX, event.clientY)
      if (!slot) {
        return
      }
      if (dragState.mode === 'move') {
        const end = Math.min(maxMinute, slot.minute + sourceDuration)
        setDragPreview({
          date: slot.date,
          startTime: toTimeLabel(slot.minute),
          endTime: toTimeLabel(Math.max(slot.minute + 15, end)),
        })
        return
      }

      const nextEnd = Math.max(slot.minute, sourceStart + 15)
      setDragPreview({
        date: sourceEvent.date,
        startTime: sourceEvent.startTime,
        endTime: toTimeLabel(Math.min(maxMinute, nextEnd)),
      })
    }

    const onPointerUp = () => {
      if (!dragPreview) {
        setDragState(null)
        return
      }
      updateEvent(sourceEvent.id, {
        ...sourceEvent,
        date: dragPreview.date,
        startTime: dragPreview.startTime,
        endTime: dragPreview.endTime,
      })
      setDragState(null)
      setDragPreview(null)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp, { once: true })
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [dragPreview, dragState, events, maxMinute, minMinute, minuteRange, updateEvent, weekDates])

  return (
    <div>
      <header className="flex items-end justify-between gap-4 pb-1 pt-1">
        <div>
          <span className="page-label">Weekly Allocation</span>
          <h1 className="page-title">Plan</h1>
          <span className="page-subtitle">{format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}</span>
        </div>
        <button
          type="button"
          className="inspo-button-primary h-10 shrink-0 px-4"
          onClick={() => openDrawerForCreate(activeDate)}
        >
          Add Event
        </button>
      </header>

      <section className="mt-6 rounded-[18px] border border-border bg-surface p-3">
        <div className="ml-11 grid grid-cols-7 gap-1 pb-2">
          {weekDates.map((item, index) => (
            <button
              key={item.iso}
              type="button"
              className={`rounded-[10px] px-2 py-1 text-center text-xs ${activeDayIndex === index ? 'bg-white/10 text-white' : 'text-tertiary'}`}
              onClick={() => setActiveDayIndex(index)}
            >
              <div className="text-[13px]">{dayLabelMini[index]}</div>
              <div className="text-[10px]">{format(item.date, 'd')}</div>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="relative w-9 shrink-0 text-[11px] text-tertiary">
            {timeTicks.map((tick) => {
              const top = ((parseMinutes(tick) - minMinute) / minuteRange) * 100
              return (
                <span key={tick} className="absolute -translate-y-1/2" style={{ top: `${top}%` }}>
                  {tick}
                </span>
              )
            })}
          </div>

          <div className="grid flex-1 grid-cols-7 gap-1">
            {weekDates.map((item, dayIndex) => {
              const dayInstances = instancesByDate[item.iso] ?? []
              return (
                <div
                  key={item.iso}
                  ref={(node) => {
                    dayColumnRefs.current[item.iso] = node
                  }}
                  className={`relative h-[640px] overflow-hidden rounded-[10px] border border-white/10 bg-[rgba(255,255,255,0.02)] text-left ${
                    activeDayIndex === dayIndex ? 'ring-1 ring-white/25' : ''
                  }`}
                  onClick={() => setActiveDayIndex(dayIndex)}
                >
                  {timeTicks.map((tick) => {
                    const top = ((parseMinutes(tick) - minMinute) / minuteRange) * 100
                    return (
                      <span key={tick} className="absolute inset-x-0 border-t border-white/[0.04]" style={{ top: `${top}%` }} />
                    )
                  })}

                  {dayInstances.map((instance) => {
                    const start = Math.max(minMinute, parseMinutes(instance.startTime))
                    const end = Math.min(maxMinute, parseMinutes(instance.endTime))
                    const safeEnd = Math.max(start + 30, end)
                    const top = ((start - minMinute) / minuteRange) * 100
                    const height = Math.max(7, ((safeEnd - start) / minuteRange) * 100)
                    const width = 100 / instance.laneCount
                    const left = width * instance.lane
                    const isDragging = dragState?.eventId === instance.event.id
                    const previewForEvent = isDragging ? dragPreview : null
                    const previewStart = previewForEvent ? parseMinutes(previewForEvent.startTime) : start
                    const previewEnd = previewForEvent ? parseMinutes(previewForEvent.endTime) : safeEnd
                    const previewTop = ((previewStart - minMinute) / minuteRange) * 100
                    const previewHeight = Math.max(7, ((Math.max(previewStart + 15, previewEnd) - previewStart) / minuteRange) * 100)
                    return (
                      <div
                        key={`${instance.event.id}-${instance.date}`}
                        className={`absolute rounded-[8px] border px-2 py-1 ${eventStyleByCategory[instance.event.category]} ${
                          isDragging ? 'opacity-90 shadow-[0_8px_18px_rgba(0,0,0,0.25)]' : ''
                        }`}
                        style={{
                          top: `${previewForEvent ? previewTop : top}%`,
                          height: `${previewForEvent ? previewHeight : height}%`,
                          left: `calc(${left}% + 2px)`,
                          width: `calc(${width}% - 4px)`,
                        }}
                        title={`${instance.event.title} ${instance.startTime}-${instance.endTime}`}
                        onPointerDown={(event) => {
                          if (event.button !== 0) {
                            return
                          }
                          event.preventDefault()
                          setActiveDayIndex(dayIndex)
                          setDragPreview({
                            date: item.iso,
                            startTime: instance.startTime,
                            endTime: instance.endTime,
                          })
                          setDragState({ eventId: instance.event.id, mode: 'move' })
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-[11px] font-medium">{instance.event.title}</p>
                          {instance.hardConflict && <span className="rounded-full bg-warning/30 px-1.5 py-0.5 text-[9px] text-warning">!</span>}
                        </div>
                        <div
                          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize rounded-b-[8px] bg-black/15"
                          onPointerDown={(event) => {
                            if (event.button !== 0) {
                              return
                            }
                            event.preventDefault()
                            event.stopPropagation()
                            setDragPreview({
                              date: item.iso,
                              startTime: instance.startTime,
                              endTime: instance.endTime,
                            })
                            setDragState({ eventId: instance.event.id, mode: 'resize' })
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted">
          {legendItems.map((item) => (
            <div key={item.category} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full border ${eventStyleByCategory[item.category]}`} />
              {item.label}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-[16px] border border-border bg-surface p-4">
        <h2 className="text-[18px] font-normal text-white">
          {weekDates[activeDayIndex]?.weekday} {weekDates[activeDayIndex]?.shortDate}
        </h2>
        {activeConflictEvents.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {activeConflictEvents.map((instance) => (
              <span key={`conflict-${instance.event.id}`} className="rounded-full border border-warning/50 bg-warning/20 px-2 py-1 text-[10px] text-warning">
                Conflict: {instance.event.title} {instance.startTime}-{instance.endTime}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 space-y-2">
          {activeDayInstances.map((instance) => (
            <article key={`${instance.event.id}-${instance.date}`} className="rounded-[12px] border border-border bg-[var(--surface-strong)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] text-white">{instance.event.title}</p>
                  <p className="text-xs text-tertiary">
                    {instance.startTime} - {instance.endTime} • {prettyCategory(instance.event.category)}
                  </p>
                  {instance.event.repeat !== 'none' && (
                    <p className="mt-1 text-[11px] text-muted">
                      Repeats weekly
                      {instance.event.repeat === 'weekly_until' && instance.event.repeatUntil ? ` until ${instance.event.repeatUntil}` : ' forever'}
                    </p>
                  )}
                  {instance.event.category === 'workout' && instance.event.workoutTemplateId && (
                    <p className="mt-1 text-[11px] text-muted">
                      Template: {templateById[instance.event.workoutTemplateId]?.name ?? 'Custom workout'}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" className="inspo-button-ghost h-8 px-3 text-[11px]" onClick={() => openDrawerForEdit(instance.event)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="inspo-button-ghost h-8 px-3 text-[11px]"
                    onClick={() => deleteEvent(instance.event.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
          {activeDayInstances.length === 0 && <p className="text-sm text-tertiary">No events scheduled for this day.</p>}
        </div>
      </section>

      <section className="mt-6 rounded-[16px] border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[18px] font-normal text-white">Workout Builder</h2>
          <button type="button" className="inspo-button-ghost h-9 px-4 text-[11px]" onClick={() => openTemplateEditor()}>
            New Template
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {templates.map((template) => (
            <article key={template.id} className="rounded-[12px] border border-border bg-[var(--surface-strong)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] text-white">{template.name}</p>
                  <p className="text-xs text-tertiary">{template.exercises.length} exercise(s)</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="inspo-button-ghost h-8 px-3 text-[11px]" onClick={() => openTemplateEditor(template)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="inspo-button-ghost h-8 px-3 text-[11px]"
                    onClick={() => {
                      deleteTemplate(template.id)
                      setFormState((state) =>
                        state.workoutTemplateId === template.id ? { ...state, workoutTemplateId: '' } : state,
                      )
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
          {templates.length === 0 && <p className="text-sm text-tertiary">No workout templates yet. Create one and attach it to workout events.</p>}
        </div>
      </section>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-3 backdrop-blur-[1px]" onClick={closeDrawer}>
          <div
            className="max-h-[88vh] w-full max-w-[560px] overflow-y-auto rounded-[22px] border border-border bg-bg p-4 md:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[20px] font-normal text-white">{editingEventId ? 'Edit Event' : 'Add Event'}</h2>
              <button type="button" className="inspo-button-ghost h-8 px-3 text-[11px]" onClick={closeDrawer}>
                Close
              </button>
            </div>

            <div className="space-y-3">
              <input
                className="inspo-field w-full"
                placeholder="Event title"
                value={formState.title}
                onChange={(event) => setFormState((state) => ({ ...state, title: event.target.value }))}
              />

              <div className="grid grid-cols-3 gap-2">
                <input
                  className="inspo-field"
                  type="date"
                  value={formState.date}
                  onChange={(event) => setFormState((state) => ({ ...state, date: event.target.value, repeatUntil: event.target.value }))}
                />
                <input
                  className="inspo-field"
                  type="time"
                  value={formState.startTime}
                  onChange={(event) => setFormState((state) => ({ ...state, startTime: event.target.value }))}
                />
                <input
                  className="inspo-field"
                  type="time"
                  value={formState.endTime}
                  onChange={(event) => setFormState((state) => ({ ...state, endTime: event.target.value }))}
                />
              </div>

              <select
                className="inspo-field w-full"
                value={formState.category}
                onChange={(event) =>
                  setFormState((state) => {
                    const nextCategory = event.target.value as EventCategory
                    return {
                      ...state,
                      category: nextCategory,
                      workoutTemplateId: nextCategory === 'workout' ? state.workoutTemplateId : '',
                    }
                  })
                }
              >
                <option value="deep">Deep Work</option>
                <option value="project">Project</option>
                <option value="health">Health</option>
                <option value="workout">Workout</option>
                <option value="deadline">Deadline</option>
                <option value="exam">Exam</option>
                <option value="other">Other</option>
              </select>

              {formState.category === 'workout' && (
                <div className="rounded-input border border-border bg-surface p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-white">Workout Template</p>
                    <button type="button" className="inspo-button-ghost h-8 px-3 text-[11px]" onClick={() => openTemplateEditor()}>
                      New Template
                    </button>
                  </div>
                  <select
                    className="inspo-field mt-2 w-full"
                    value={formState.workoutTemplateId}
                    onChange={(event) => setFormState((state) => ({ ...state, workoutTemplateId: event.target.value }))}
                  >
                    <option value="">Choose template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  {formState.workoutTemplateId && (
                    <div className="mt-2">
                      <button
                        type="button"
                        className="inspo-button-ghost h-8 px-3 text-[11px]"
                        onClick={() => {
                          const selectedTemplate = templates.find((template) => template.id === formState.workoutTemplateId)
                          openTemplateEditor(selectedTemplate)
                        }}
                      >
                        Edit Selected Template
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-input border border-border bg-surface p-3">
                <label className="flex items-center gap-2 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={formState.repeatWeekly}
                    onChange={(event) => setFormState((state) => ({ ...state, repeatWeekly: event.target.checked }))}
                  />
                  Repeat weekly
                </label>
                {formState.repeatWeekly && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <select
                      className="inspo-field"
                      value={formState.repeatEnds}
                      onChange={(event) => setFormState((state) => ({ ...state, repeatEnds: event.target.value as RepeatEnds }))}
                    >
                      <option value="forever">Forever</option>
                      <option value="until">Until date</option>
                    </select>
                    <input
                      className="inspo-field"
                      type="date"
                      disabled={formState.repeatEnds !== 'until'}
                      value={formState.repeatUntil}
                      onChange={(event) => setFormState((state) => ({ ...state, repeatUntil: event.target.value }))}
                    />
                  </div>
                )}
              </div>

              <textarea
                className="inspo-textarea h-20 w-full"
                placeholder="Optional notes"
                value={formState.notes}
                onChange={(event) => setFormState((state) => ({ ...state, notes: event.target.value }))}
              />

              {templateEditorOpen && (
                <div className="rounded-input border border-border bg-surface p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm text-white">{editingTemplateId ? 'Edit Workout Template' : 'New Workout Template'}</p>
                    <button
                      type="button"
                      className="inspo-button-ghost h-8 px-3 text-[11px]"
                      onClick={() => {
                        setTemplateEditorOpen(false)
                        setEditingTemplateId(null)
                        setTemplateError('')
                      }}
                    >
                      Close
                    </button>
                  </div>

                  <input
                    className="inspo-field w-full"
                    placeholder="Template name"
                    value={templateNameDraft}
                    onChange={(event) => setTemplateNameDraft(event.target.value)}
                  />

                  <div className="mt-2 space-y-2">
                    {templateExercisesDraft.map((exercise, index) => (
                      <div key={exercise.id} className="rounded-input border border-white/10 bg-[rgba(255,255,255,0.02)] p-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-tertiary">Exercise {index + 1}</p>
                          <button
                            type="button"
                            className="inspo-button-ghost h-7 px-2 text-[10px]"
                            onClick={() =>
                              setTemplateExercisesDraft((items) => (items.length > 1 ? items.filter((item) => item.id !== exercise.id) : items))
                            }
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          className="inspo-field mt-2 w-full"
                          placeholder="Exercise name"
                          value={exercise.name}
                          onChange={(event) =>
                            setTemplateExercisesDraft((items) =>
                              items.map((item) => (item.id === exercise.id ? { ...item, name: event.target.value } : item)),
                            )
                          }
                        />
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          <input
                            className="inspo-field"
                            type="number"
                            min={1}
                            placeholder="Sets"
                            value={exercise.plannedSets}
                            onChange={(event) =>
                              setTemplateExercisesDraft((items) =>
                                items.map((item) => (item.id === exercise.id ? { ...item, plannedSets: event.target.value } : item)),
                              )
                            }
                          />
                          <input
                            className="inspo-field"
                            type="number"
                            min={1}
                            placeholder="Reps"
                            value={exercise.plannedReps}
                            onChange={(event) =>
                              setTemplateExercisesDraft((items) =>
                                items.map((item) => (item.id === exercise.id ? { ...item, plannedReps: event.target.value } : item)),
                              )
                            }
                          />
                          <input
                            className="inspo-field"
                            type="number"
                            min={0}
                            step="0.5"
                            placeholder="Kg"
                            value={exercise.weightKg}
                            onChange={(event) =>
                              setTemplateExercisesDraft((items) =>
                                items.map((item) => (item.id === exercise.id ? { ...item, weightKg: event.target.value } : item)),
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="inspo-button-ghost h-8 px-3 text-[11px]"
                      onClick={() => setTemplateExercisesDraft((items) => [...items, createExerciseDraft()])}
                    >
                      Add Exercise
                    </button>
                    <button type="button" className="inspo-button-primary h-8 px-3 text-[11px]" onClick={onSaveTemplate}>
                      Save Template
                    </button>
                  </div>
                  {templateError && <p className="mt-2 text-xs text-warning">{templateError}</p>}
                </div>
              )}

              {formError && <p className="text-xs text-warning">{formError}</p>}

              <button type="button" className="inspo-button-primary h-11 w-full" onClick={saveEvent}>
                {editingEventId ? 'Save changes' : 'Add event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
