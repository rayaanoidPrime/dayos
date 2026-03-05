import { useState } from 'react'
import { Card } from '../components/Card'
import { useUIStore } from '../store/uiStore'

export function SettingsPage() {
  const examMode = useUIStore((state) => state.examMode)
  const setExamMode = useUIStore((state) => state.setExamMode)
  const setSundayPlan = useUIStore((state) => state.setSundayPlan)

  const [examTitle, setExamTitle] = useState(examMode.examTitle)
  const [examDate, setExamDate] = useState(examMode.examDate)

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
        <button
          type="button"
          className="h-12 w-full rounded-full border border-border px-4 text-sm font-semibold"
          onClick={() =>
            setSundayPlan({
              workoutIntentions: 'PPL + 1 cardio session',
              studyIntentions: 'Finish ME256 module 4',
              researchIntentions: 'Complete literature review draft',
              weeklyGoal: 'Ship consistent deep work blocks.',
            })
          }
        >
          Seed sample weekly plan
        </button>
      </Card>
    </div>
  )
}

