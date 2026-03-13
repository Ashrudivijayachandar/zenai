# ZenAi Verified Architecture and Agent Workflow

This document is the code-accurate architecture and workflow explanation for ZenAi.
It reflects the current implementation and naming in the repository.

## 1. End-to-End System Architecture

```text
React Frontend (Student + Faculty dashboards)
  -> Axios API client with JWT header
Node.js + Express Backend
  -> authMiddleware verifies token
  -> chatController handles all agent chats
  -> aiService resolves intent/action
  -> actionRouter executes allowed action
  -> dataService reads/writes datasets
PostgreSQL
  -> app_json_data (JSONB datasets)
```

## 2. Shared Pipeline Connection Model

All agents are connected through one shared backend pipeline and one shared data layer.

- Faculty agents mostly write operational records.
- Student agents mostly read the same records with identity-scoped filtering.
- Both roles use the same controller + router path, but role checks isolate access.

```text
Faculty Agent action (write)
  -> actionRouter
  -> dataService write
  -> PostgreSQL JSONB + in-memory cache

Student Agent action (read)
  -> actionRouter
  -> dataService read
  -> same updated dataset
```

## 3. Exact Role Isolation Behavior

- JWT is validated by middleware.
- User role is decoded from token (student/faculty).
- chatController blocks role mismatch for agent usage.
- Agent list is role-filterable from agentController.

Result:
- Student cannot open faculty-only agent flow.
- Faculty cannot open student-only agent flow.

## 4. Verified Write -> Read Data Sync Flow

Example: faculty updates student GPA, student reads latest GPA.

1. Faculty sends: "update Rahul GPA to 8.9" in a faculty-capable agent.
2. aiService resolves update_student.
3. actionRouter updates students dataset.
4. dataService persists update to PostgreSQL and cache.
5. Student Rahul asks "my gpa".
6. aiService resolves view_my_gpa.
7. actionRouter reads the same updated record.
8. Student sees updated GPA immediately.

Same applies to marks and attendance:
- Faculty enters marks -> student results/marks agent sees new marks.
- Faculty records attendance -> student attendance agent sees updated attendance.

## 5. Canonical Action Names (Current Code)

Use these canonical names in prompts and documentation:

- Student/class CRUD: list_students, create_student, update_student, delete_student
- Faculty CRUD: list_faculty, add_faculty, delete_faculty, assign_subject, generate_workload
- Courses: list_courses, create_course, update_course, delete_course
- Attendance: record_attendance, list_attendance, attendance_report
- Marks: enter_marks, view_marks, update_marks, delete_marks, view_marks_analytics
- Exams/schedule: schedule_exam, list_exams, view_schedule
- Student self-service: view_my_gpa, view_my_courses, view_my_marks, view_my_results, view_my_attendance, view_my_profile
- Reports: generate_report

Important naming notes:
- create_faculty is not canonical in this codebase; add_faculty is canonical.
- mark_attendance is not canonical; record_attendance is canonical.
- analytics_report is not canonical; generate_report is canonical.

## 6. Add New Agent Workflow (Implemented)

Current flow is implemented as template-driven agent creation:

1. User enters purpose in Create Agent page.
2. Optional template metadata is sent (templateDomain/templateName).
3. backend agentController picks matching domain template.
4. Agent is created with:
   - name
   - role
   - domain
   - allowedActions
   - systemPrompt
5. Agent is saved and immediately visible in list/chat.

Template domains currently supported by backend:
- student
- faculty
- course
- attendance
- exam

## 7. Deletion Confirmation Behavior

Delete confirmation is configurable:

- Env var: REQUIRE_DELETE_CONFIRMATION
- true -> delete requires YES/NO confirmation gate
- false -> delete executes without hard confirmation gate

Current default behavior in code uses false unless env overrides it.

## 8. Why Faculty and Student Agents Stay Synchronized

Synchronization happens because both roles operate on the same logical datasets through dataService.
There is no separate student database and faculty database.

So the final model is:

```text
Faculty agents write institutional truth
Student agents read institutional truth
Role guard controls who can do what
Identity filter controls what each student can see
```

## 9. Validation Status

The comprehensive test suite has passed end-to-end for the implemented behavior:

- Agent NLP routing
- Action execution
- Role-safe usage
- Agent creation flow

Status: all tests passing in the latest run.
