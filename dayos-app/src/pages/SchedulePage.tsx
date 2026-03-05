import { format, parseISO } from 'date-fns'
import { useMemo, useState } from 'react'
import { Card } from '../components/Card'
import { useScheduleStore } from '../store/scheduleStore'

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function SchedulePage() {
  const recurringClasses = useScheduleStore((state) => state.recurringClasses)
  const events = useScheduleStore((state) => state.events)
  const addEvent = useScheduleStore((state) => state.addEvent)

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
      <Card title="Weekly Schedule">
        <div className="space-y-2">
          {dayLabels.map((day, index) => (
            <div key={day} className="rounded-input border border-border p-2 text-sm">
              <p className="font-semibold text-text">{day}</p>
              <ul className="mt-1 space-y-1 text-xs text-muted">
                {classesByDay[index].map((item) => (
                  <li key={item.id}>
                    {item.startTime}-{item.endTime} {item.course} ({item.room})
                  </li>
                ))}
                {classesByDay[index].length === 0 && <li>No classes</li>}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Events & Deadlines">
        <div className="space-y-2">
          <input
            className="h-10 w-full rounded-input border border-border px-3 text-sm"
            placeholder="Event title"
            value={eventTitle}
            onChange={(event) => setEventTitle(event.target.value)}
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              className="h-10 rounded-input border border-border px-2 text-sm"
              type="date"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
            />
            <input
              className="h-10 rounded-input border border-border px-2 text-sm"
              type="time"
              value={eventTime}
              onChange={(event) => setEventTime(event.target.value)}
            />
            <select
              className="h-10 rounded-input border border-border px-2 text-sm"
              value={eventType}
              onChange={(event) => setEventType(event.target.value as 'deadline' | 'exam' | 'other')}
            >
              <option value="deadline">Deadline</option>
              <option value="exam">Exam</option>
              <option value="other">Other</option>
            </select>
          </div>
          <button type="button" className="h-10 w-full rounded-full bg-primary text-sm font-semibold text-white" onClick={onAddEvent}>
            Add event
          </button>
        </div>

        <ul className="mt-3 space-y-2">
          {sortedEvents.map((event) => (
            <li key={event.id} className="rounded-input border border-border p-2 text-sm">
              <p className="font-semibold text-text">{event.title}</p>
              <p className="text-xs text-muted">
                {format(parseISO(`${event.date}T00:00:00`), 'EEE, MMM d')} {event.time} - {event.type}
              </p>
            </li>
          ))}
          {sortedEvents.length === 0 && <li className="text-sm text-muted">No upcoming events yet.</li>}
        </ul>
      </Card>
    </div>
  )
}

