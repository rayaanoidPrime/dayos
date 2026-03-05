import { format, parseISO } from 'date-fns'
import { useMemo, useState } from 'react'
import { useScheduleStore } from '../store/scheduleStore'

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function SchedulePage() {
  const recurringClasses = useScheduleStore((state) => state.recurringClasses)
  const events = useScheduleStore((state) => state.events)
  const addEvent = useScheduleStore((state) => state.addEvent)

  const [activeDayIndex, setActiveDayIndex] = useState((new Date().getDay() + 6) % 7)
  const [eventTitle, setEventTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('18:00')
  const [eventType, setEventType] = useState<'deadline' | 'exam' | 'other'>('deadline')

  const classesByDay = useMemo(() => {
    return dayLabels.map((_, index) =>
      recurringClasses
        .filter((item) => item.dayOfWeek === index + 1)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    )
  }, [recurringClasses])

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)),
    [events],
  )

  const activeDayClasses = classesByDay[activeDayIndex] ?? []

  const activeDayEvents = useMemo(
    () =>
      sortedEvents.filter((event) => {
        const date = new Date(`${event.date}T00:00:00`)
        return ((date.getDay() + 6) % 7) === activeDayIndex
      }),
    [activeDayIndex, sortedEvents],
  )

  const onAddEvent = () => {
    if (!eventTitle.trim() || !eventDate) {
      return
    }
    addEvent({
      title: eventTitle.trim(),
      date: eventDate,
      time: eventTime,
      type: eventType,
    })
    setEventTitle('')
  }

  return (
    <div>
      <header className="pb-1 pt-1">
        <span className="page-label">Weekly Schedule</span>
        <h1 className="page-title">Plan</h1>
      </header>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {dayLabels.map((day, index) => (
          <button
            key={day}
            type="button"
            className={`flex h-11 min-w-11 items-center justify-center rounded-input border text-[13px] ${
              activeDayIndex === index
                ? 'border-white/40 bg-white/15 text-white'
                : 'border-border bg-white/5 text-tertiary'
            }`}
            onClick={() => setActiveDayIndex(index)}
          >
            {day}
          </button>
        ))}
      </div>

      <section className="mt-5">
        <h2 className="mb-3 text-[20px] font-normal text-text">Day Focus</h2>
        <div className="space-y-2">
          {activeDayClasses.map((item) => (
            <div key={item.id} className="rounded-input border border-border bg-surface p-3">
              <p className="mb-1 text-[11px] uppercase tracking-[0.05em] text-tertiary">{dayLabels[activeDayIndex]}</p>
              <p className="text-[15px] text-text">{item.course}</p>
              <p className="text-[13px] text-tertiary">
                {item.startTime} - {item.endTime} ({item.room})
              </p>
            </div>
          ))}
          {activeDayClasses.length === 0 && <p className="text-sm text-tertiary">No classes scheduled.</p>}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-[20px] font-normal text-text">Events</h2>
        <div className="space-y-2">
          {activeDayEvents.map((event) => (
            <div key={event.id} className="rounded-input border border-border bg-surface p-3">
              <p className="mb-1 text-[11px] uppercase tracking-[0.05em] text-tertiary">{event.type}</p>
              <p className="text-[15px] text-text">{event.title}</p>
              <p className="text-[13px] text-tertiary">
                {format(parseISO(`${event.date}T00:00:00`), 'EEE, MMM d')} at {event.time}
              </p>
            </div>
          ))}
          {activeDayEvents.length === 0 && <p className="text-sm text-tertiary">No events on this day.</p>}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-[20px] font-normal text-text">Add Event</h2>
        <div className="space-y-2">
          <input
            className="inspo-field w-full"
            placeholder="Event title"
            value={eventTitle}
            onChange={(event) => setEventTitle(event.target.value)}
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              className="inspo-field"
              type="date"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
            />
            <input
              className="inspo-field"
              type="time"
              value={eventTime}
              onChange={(event) => setEventTime(event.target.value)}
            />
            <select
              className="inspo-field"
              value={eventType}
              onChange={(event) => setEventType(event.target.value as 'deadline' | 'exam' | 'other')}
            >
              <option value="deadline">Deadline</option>
              <option value="exam">Exam</option>
              <option value="other">Other</option>
            </select>
          </div>
          <button type="button" className="inspo-button-primary h-10 w-full" onClick={onAddEvent}>
            Add event
          </button>
        </div>
      </section>
    </div>
  )
}
