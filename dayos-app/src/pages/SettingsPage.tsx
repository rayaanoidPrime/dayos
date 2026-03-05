import { useState } from 'react'
import { format, startOfWeek } from 'date-fns'
import { Card } from '../components/Card'
import { upsertSundayPlan } from '../lib/db'
import { useUIStore } from '../store/uiStore'

export function SettingsPage() {
  const examMode = useUIStore((state) => state.examMode)
  const setExamMode = useUIStore((state) => state.setExamMode)
  const setSundayPlan = useUIStore((state) => state.setSundayPlan)

  const [examTitle, setExamTitle] = useState(examMode.examTitle)
  const [examDate, setExamDate] = useState(examMode.examDate)
  const [workoutIntentions, setWorkoutIntentions] = useState('PPL + 1 cardio session')
  const [studyIntentions, setStudyIntentions] = useState('Finish ME256 module 4')
  const [researchIntentions, setResearchIntentions] = useState('Complete literature review draft')
  const [weeklyGoal, setWeeklyGoal] = useState('Ship consistent deep work blocks.')
  const [planStatus, setPlanStatus] = useState('')

  const saveSundayPlan = async () => {
    const weekStartDate = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    await upsertSundayPlan({
      weekStartDate,
      workoutIntentions,
      studyIntentions,
      researchIntentions,
      weeklyGoal,
    })
    setSundayPlan({
      workoutIntentions,
      studyIntentions,
      researchIntentions,
      weeklyGoal,
    })
    setPlanStatus(`Saved plan for week starting ${weekStartDate}.`)
  }

  return (
    <div className="space-y-3">
      <Card title="Exam Mode">
        <div className="space-y-2">
          <input
            className="h-12 w-full rounded-input border border-border px-3"
            placeholder="Exam title"
            value={examTitle}
            onChange={(event) => setExamTitle(event.target.value)}
          />
          <input
            className="h-12 w-full rounded-input border border-border px-3"
            type="date"
            value={examDate}
            onChange={(event) => setExamDate(event.target.value)}
          />
          <button
            type="button"
            className="h-12 w-full rounded-full bg-primary px-4 font-semibold text-white"
            onClick={() => setExamMode(!examMode.active, examTitle, examDate)}
          >
            {examMode.active ? 'Disable' : 'Enable'} Exam Mode
          </button>
        </div>
      </Card>

      <Card title="Sunday Planning">
        <div className="space-y-2">
          <input
            className="h-12 w-full rounded-input border border-border px-3"
            value={workoutIntentions}
            onChange={(event) => setWorkoutIntentions(event.target.value)}
            placeholder="Workout intentions"
          />
          <input
            className="h-12 w-full rounded-input border border-border px-3"
            value={studyIntentions}
            onChange={(event) => setStudyIntentions(event.target.value)}
            placeholder="Study intentions"
          />
          <input
            className="h-12 w-full rounded-input border border-border px-3"
            value={researchIntentions}
            onChange={(event) => setResearchIntentions(event.target.value)}
            placeholder="Research intentions"
          />
          <input
            className="h-12 w-full rounded-input border border-border px-3"
            value={weeklyGoal}
            onChange={(event) => setWeeklyGoal(event.target.value)}
            placeholder="Weekly goal"
          />
        </div>
        <button
          type="button"
          className="mt-2 h-12 w-full rounded-full border border-border px-4 text-sm font-semibold"
          onClick={() => void saveSundayPlan()}
        >
          Save weekly plan
        </button>
        {planStatus && <p className="mt-2 text-xs text-success">{planStatus}</p>}
      </Card>
    </div>
  )
}

