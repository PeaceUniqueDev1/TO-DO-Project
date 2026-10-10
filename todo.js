
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const reminderInput = document.getElementById("reminder-time");
const taskList = document.getElementById("task-list");
const taskCount = document.getElementById("task-count");
const emptyMessage = document.getElementById("empty-message");
const finishedMessage = document.getElementById("finished-message");
const alarmBox = document.getElementById("alarm-box");
const alarmTaskName = document.getElementById("alarm-task-name");
const stopAlarmButton = document.getElementById("stop-alarm");

const STORAGE_KEY = "my-daily-tasks";
let tasks = [];
let ringingTaskId = null;
let alarmInterval = null;
let audioContext = null;

const firedAlarms = new Set();

try {
  const savedTasks = JSON.parse(
    localStorage.getItem(STORAGE_KEY) || "[]"
  );

  if (Array.isArray(savedTasks)) {
    tasks = savedTasks.filter(task =>
      task &&
      typeof task.id === "string" &&
      typeof task.name === "string"
    );
  }
} catch {
  tasks = [];
}

// Show today's date.
document.getElementById("today-date").textContent =
  new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

// Save tasks in the browser.
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    alert("Sorry, your tasks could not be saved. Please check your browser storage.");
  }
}

// Add a new task.
taskForm.addEventListener("submit", function(event) {
  event.preventDefault();

  const name = taskInput.value.trim();

  if (!name) {
    alert("Please write what you want to do.");
    taskInput.focus();
    return;
  }

  let reminder = "";

  if (reminderInput.value) {
    const reminderDate = new Date(reminderInput.value);

    if (Number.isNaN(reminderDate.getTime())) {
      alert("Please choose a valid reminder time.");
      return;
    }

    if (reminderDate.getTime() <= Date.now()) {
      alert("Please choose a time in the future.");
      reminderInput.focus();
      return;
    }

    reminder = reminderDate.toISOString();
  }

  const task = {
    id: createId(),
    name: name,
    reminder: reminder,
    completed: false
  };

  tasks.push(task);

  saveTasks();
  showTasks();

  taskForm.reset();
  taskInput.focus();
});

// Make a unique ID for each task.
function createId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2);
}

// Display all tasks.
function showTasks() {
  taskList.replaceChildren();

  tasks.forEach(function(task) {
    const card = document.createElement("div");
    card.className = "task-card";

    if (task.completed) {
      card.classList.add("completed");
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", "Mark task as finished");

    checkbox.addEventListener("change", function() {
      task.completed = checkbox.checked;

      if (task.completed && ringingTaskId === task.id) {
        stopAlarm();
      }

      saveTasks();
      showTasks();
    });

    const details = document.createElement("div");
    details.className = "task-details";

    const name = document.createElement("p");
    name.className = "task-name";
    name.textContent = task.name;

    details.appendChild(name);

    if (task.reminder) {
      const reminder = document.createElement("p");
      reminder.className = "task-reminder";

      const reminderDate = new Date(task.reminder);

      reminder.textContent =
        "⏰ Remind me: " +
        reminderDate.toLocaleString([], {
          dateStyle: "medium",
          timeStyle: "short"
        });

      details.appendChild(reminder);
    }

    const actions = document.createElement("div");
    actions.className = "task-actions";

    if (!task.completed) {
      const doneButton = document.createElement("button");
      doneButton.className = "done-button";
      doneButton.textContent = "I'm done!";

      doneButton.addEventListener("click", function() {
        task.completed = true;

        if (ringingTaskId === task.id) {
          stopAlarm();
        }

        saveTasks();
        showTasks();
      });

      actions.appendChild(doneButton);
    }

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", function() {
      deleteTask(task.id);
    });

    actions.appendChild(deleteButton);
    details.appendChild(actions);

    card.appendChild(checkbox);
    card.appendChild(details);

    taskList.appendChild(card);
  });

  // Update the number of unfinished tasks.
  const remaining = tasks.filter(task => !task.completed).length;

  taskCount.textContent =
    remaining === 1
      ? "You have 1 task left to do."
      : `You have ${remaining} tasks left to do.`;

  emptyMessage.classList.toggle("hidden", tasks.length > 0);

  finishedMessage.classList.toggle(
    "hidden",
    tasks.length === 0 || remaining !== 0
  );
}

// Delete a task.
function deleteTask(id) {
  const task = tasks.find(item => item.id === id);

  if (!task) return;

  if (!confirm("Do you want to delete this task?")) {
    return;
  }

  tasks = tasks.filter(item => item.id !== id);
  firedAlarms.delete(id);

  if (ringingTaskId === id) {
    stopAlarm();
  }

  saveTasks();
  showTasks();
}

// Play a short alarm sound.
function playAlarmSound() {
  try {
    const AudioClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioClass) return;

    if (!audioContext) {
      audioContext = new AudioClass();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const volume = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    volume.gain.value = 0.15;

    oscillator.connect(volume);
    volume.connect(audioContext.destination);

    oscillator.start();

    volume.gain.setTargetAtTime(
      0,
      audioContext.currentTime + 0.4,
      0.08
    );

    oscillator.stop(audioContext.currentTime + 0.8);
  } catch (error) {
    console.log("The alarm sound could not play.");
  }
}

// Start the alarm.
function startAlarm(task) {
  ringingTaskId = task.id;

  alarmTaskName.textContent = task.name;
  alarmBox.classList.remove("hidden");

  playAlarmSound();

  alarmInterval = setInterval(function() {
    playAlarmSound();
  }, 1800);

  alarmBox.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

// Stop the alarm.
function stopAlarm() {
  if (alarmInterval !== null) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }

  ringingTaskId = null;
  alarmBox.classList.add("hidden");
}

stopAlarmButton.addEventListener("click", stopAlarm);

// Check whether a reminder is due.
function checkReminders() {
  if (ringingTaskId !== null) return;

  const now = Date.now();

  for (const task of tasks) {
    if (
      task.completed ||
      !task.reminder ||
      firedAlarms.has(task.id)
    ) {
      continue;
    }

    const reminderTime = new Date(task.reminder).getTime();

    if (!Number.isNaN(reminderTime) && now >= reminderTime) {
      firedAlarms.add(task.id);
      startAlarm(task);
      break;
    }
  }
}

// Start the app.
showTasks();
checkReminders();

setInterval(checkReminders, 1000);
