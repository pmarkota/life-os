import { NextResponse } from "next/server";

// --- Todoist API Types ---

interface TodoistDue {
  date: string;
  is_recurring: boolean;
  datetime: string | null;
  string: string;
  timezone: string | null;
}

interface TodoistTask {
  id: string;
  content: string;
  description: string;
  is_completed: boolean;
  priority: number; // Todoist: 1=normal, 4=urgent
  due: TodoistDue | null;
  project_id: string;
}

interface TodoistProject {
  id: string;
  name: string;
}

// --- Our normalized task type ---

interface NormalizedTask {
  id: string;
  content: string;
  description: string;
  due_date: string | null;
  priority: "urgent" | "high" | "medium" | "normal";
  project_name: string | null;
  is_completed: boolean;
}

/**
 * Map Todoist's inverted priority (4=urgent, 1=normal)
 * to our human-readable format.
 */
function mapPriority(todoistPriority: number): NormalizedTask["priority"] {
  switch (todoistPriority) {
    case 4:
      return "urgent";
    case 3:
      return "high";
    case 2:
      return "medium";
    default:
      return "normal";
  }
}

// GET /api/todoist/sync — Fetch active tasks from Todoist
export async function GET() {
  try {
    const token = process.env.TODOIST_API_TOKEN;

    if (!token) {
      return NextResponse.json(
        { tasks: [], error: "TODOIST_API_TOKEN not configured" },
        { status: 200 },
      );
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // Fetch tasks and projects in parallel
    const [tasksResponse, projectsResponse] = await Promise.all([
      fetch("https://api.todoist.com/rest/v2/tasks", { headers }),
      fetch("https://api.todoist.com/rest/v2/projects", { headers }),
    ]);

    if (!tasksResponse.ok) {
      const errorText = await tasksResponse.text();
      console.error("Todoist tasks API error:", tasksResponse.status, errorText);
      return NextResponse.json(
        {
          tasks: [],
          error: `Todoist API returned ${tasksResponse.status}`,
        },
        { status: 200 },
      );
    }

    const rawTasks = (await tasksResponse.json()) as TodoistTask[];

    // Build project ID -> name map
    let projectMap = new Map<string, string>();

    if (projectsResponse.ok) {
      const projects = (await projectsResponse.json()) as TodoistProject[];
      projectMap = new Map(projects.map((p) => [p.id, p.name]));
    } else {
      console.warn(
        "Could not fetch Todoist projects:",
        projectsResponse.status,
      );
    }

    // Target projects (filter only if we can identify them)
    const targetProjectNames = new Set([
      "Elevera Studio",
      "Fakultet",
      "Osobno",
      "Tatin posao",
    ]);

    // Find project IDs that match our target names
    const targetProjectIds = new Set<string>();
    for (const [id, name] of projectMap) {
      if (targetProjectNames.has(name)) {
        targetProjectIds.add(id);
      }
    }

    // Filter tasks: only from target projects if we found any,
    // otherwise return all tasks (graceful fallback)
    const filteredTasks =
      targetProjectIds.size > 0
        ? rawTasks.filter((t) => targetProjectIds.has(t.project_id))
        : rawTasks;

    // Normalize tasks to our format
    const tasks: NormalizedTask[] = filteredTasks.map((t) => ({
      id: t.id,
      content: t.content,
      description: t.description || "",
      due_date: t.due?.date ?? null,
      priority: mapPriority(t.priority),
      project_name: projectMap.get(t.project_id) ?? null,
      is_completed: t.is_completed,
    }));

    // Sort: urgent first, then by due date (soonest first, null last)
    tasks.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, normal: 3 };
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;

      // Both have due dates — compare them
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      // Tasks with due dates come first
      if (a.due_date && !b.due_date) return -1;
      if (!a.due_date && b.due_date) return 1;
      return 0;
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Todoist sync error:", error);
    return NextResponse.json(
      {
        tasks: [],
        error:
          error instanceof Error
            ? error.message
            : "Unknown error syncing Todoist",
      },
      { status: 200 },
    );
  }
}
