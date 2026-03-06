import type { ResearchProject, ResearchWorklog } from '../store/researchStore'

export type ExportFormat = 'csv' | 'json' | 'md'

function escapeCsv(text: string | null | undefined): string {
  if (!text) return ''
  const str = String(text)
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function exportProjectWorklogs(
  project: ResearchProject,
  worklogs: ResearchWorklog[],
  format: ExportFormat,
): void {
  const projectLogs = worklogs
    .filter((log) => log.projectId === project.id)
    .sort((a, b) => b.date.localeCompare(a.date)) // descending

  let content = ''
  let mimeType = 'text/plain;charset=utf-8'
  let extension = format

  if (format === 'json') {
    mimeType = 'application/json'
    content = JSON.stringify(
      {
        project: {
          name: project.name,
          description: project.description,
          createdAt: project.createdAt,
        },
        worklogs: projectLogs,
      },
      null,
      2,
    )
  } else if (format === 'csv') {
    mimeType = 'text/csv;charset=utf-8;'
    const headers = ['Date', 'Hours', 'Title', 'Summary', 'Outputs', 'Blockers', 'Next Steps']
    content += headers.join(',') + '\n'

    projectLogs.forEach((log) => {
      const row = [
        log.date,
        String(log.hours),
        escapeCsv(log.title),
        escapeCsv(log.summary),
        escapeCsv(log.outputs),
        escapeCsv(log.blockers),
        escapeCsv(log.nextSteps),
      ]
      content += row.join(',') + '\n'
    })
  } else if (format === 'md') {
    mimeType = 'text/markdown;charset=utf-8;'
    content += `# ${project.name} - Research Worklogs\n\n`
    if (project.description) content += `*${project.description}*\n\n`

    if (projectLogs.length === 0) {
      content += `No worklogs recorded yet.\n`
    } else {
      projectLogs.forEach((log) => {
        content += `## ${log.date} - ${log.title} (${log.hours}h)\n\n`
        content += `${log.summary}\n\n`
        if (log.outputs) content += `**Outputs:**\n${log.outputs}\n\n`
        if (log.blockers) content += `**Blockers:**\n${log.blockers}\n\n`
        if (log.nextSteps) content += `**Next Steps:**\n${log.nextSteps}\n\n`
        content += `---\n\n`
      })
    }
  }

  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-worklog-${dateStr}.${extension}`

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
