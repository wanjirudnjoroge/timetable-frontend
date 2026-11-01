export interface Section {
  id: number
  name: string
  order: number
}

export interface Period {
  id: number
  section: number
  label: string
  start_time: string
  end_time: string
  is_break: boolean
}

export interface Stream {
  id: number
  section: number
  grade: string
  stream: string
  label: string
}

export interface Area {
  id: number
  code: string
  name: string
}

export interface Teacher {
  id: number
  code: string
  title: string
  full_name: string
  display_name: string
}

export interface Lesson {
  id: number
  class_stream: number
  day: number
  period: number
  learning_area: number
  teacher: number
  area_code: string
  teacher_code: string
}

export interface Requirement {
  class_stream: number
  learning_area: number
  lessons_per_week: number
}

export type CountStatus = 'ok' | 'under' | 'over'

export interface CountRow {
  learning_area: number
  code: string
  name: string
  required: number
  assigned: number
  status: CountStatus
}

export interface StreamCounts {
  class_stream: number
  label: string
  rows: CountRow[]
  issues: number
}

export interface Timetable {
  section: Section
  periods: Period[]
  streams: Stream[]
  lessons: Lesson[]
  requirements: Requirement[]
  counts: StreamCounts[]
}

export interface Clashes {
  count: number
  lesson_ids: number[]
  by_section: { section_id: number; name: string; count: number }[]
  total_lessons: number
}

export interface Bootstrap {
  sections: Section[]
  areas: Area[]
  teachers: Teacher[]
}

export interface BusyInfo {
  text: string
  lesson_id: number
}

export interface ScheduleItem {
  id: number
  day: number
  start_time: string
  end_time: string
  period_label: string
  area_code: string
  area_name: string
  class_label: string
  section: string
}

export interface TeacherLookup {
  teacher: Teacher
  lessons: ScheduleItem[]
  total: number
}

export interface LessonPayload {
  class_stream: number
  day: number
  period: number
  learning_area: number
  teacher: number
}

export interface PeriodPayload {
  section_id?: number
  label: string
  start_time: string
  end_time: string
  is_break: boolean
}
