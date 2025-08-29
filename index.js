require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public')); // if you keep the views/public

// In-memory "database"
const users = {};      // _id -> { username, _id, exercises: [{description,duration,date}] }
const usersList = [];  // array of { username, _id } to return for /api/users

// Helper to create unique IDs (small & safe for examples)
function makeId() {
  return (Date.now().toString(36) + Math.random().toString(36).slice(2,8));
}

// Create a new user
app.post('/api/users', (req, res) => {
  const username = req.body.username;
  if (!username) return res.status(400).json({ error: 'username required' });

  // Create user
  const _id = makeId();
  users[_id] = { username, _id, exercises: [] };
  usersList.push({ username, _id });

  // Response: { username, _id }
  res.json({ username, _id });
});

// Get all users
app.get('/api/users', (req, res) => {
  // Return array of { username, _id }
  res.json(usersList);
});

// Add exercise to a user
app.post('/api/users/:_id/exercises', (req, res) => {
  const _id = req.params._id;
  const user = users[_id];
  if (!user) return res.status(400).json({ error: 'unknown _id' });

  const description = req.body.description;
  const duration = Number(req.body.duration);
  let date = req.body.date; // optional

  if (!description || !req.body.duration) {
    return res.status(400).json({ error: 'description and duration are required' });
  }
  if (Number.isNaN(duration)) {
    return res.status(400).json({ error: 'duration must be a number' });
  }

  if (!date) {
    date = new Date();
  } else {
    date = new Date(date);
  }

  if (date.toString() === 'Invalid Date') {
    return res.status(400).json({ error: 'invalid date' });
  }

  // Save exercise
  const exercise = {
    description: description.toString(),
    duration: duration,
    date: date
  };
  user.exercises.push(exercise);

  // Response should be: { username, description, duration, date: "Mon Jan 01 1990", _id }
  res.json({
    username: user.username,
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date.toDateString(),
    _id: user._id
  });
});

// Get user logs with optional from, to, limit
app.get('/api/users/:_id/logs', (req, res) => {
  const _id = req.params._id;
  const user = users[_id];
  if (!user) return res.status(400).json({ error: 'unknown _id' });

  let { from, to, limit } = req.query;

  let logs = user.exercises.slice(); // shallow copy

  // apply from filter (inclusive)
  if (from) {
    const fromDate = new Date(from);
    if (fromDate.toString() !== 'Invalid Date') {
      logs = logs.filter(e => e.date >= fromDate);
    }
  }

  // apply to filter (inclusive)
  if (to) {
    const toDate = new Date(to);
    if (toDate.toString() !== 'Invalid Date') {
      logs = logs.filter(e => e.date <= toDate);
    }
  }

  // sort by date ascending (optional but predictable)
  logs.sort((a, b) => a.date - b.date);

  // apply limit
  if (limit) {
    const lim = Number(limit);
    if (!Number.isNaN(lim)) logs = logs.slice(0, lim);
  }

  // Build log objects with date strings
  const logOutput = logs.map(e => ({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString()
  }));

  // Response: { username, count, _id, log: [...] }
  res.json({
    username: user.username,
    count: logOutput.length,
    _id: user._id,
    log: logOutput
  });
});

// Basic home (optional)
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Exercise Tracker listening on port ${PORT}`);
});
