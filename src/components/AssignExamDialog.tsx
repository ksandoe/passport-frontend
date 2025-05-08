import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, FormControl, InputLabel, Select, MenuItem, TextField, CircularProgress
} from '@mui/material';
import axios from 'axios';
import { DateTime } from 'luxon';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ClassItem {
  class_id: string;
  name: string;
}

interface AssignExamDialogProps {
  open: boolean;
  onClose: () => void;
  onAssign: (success: boolean) => void;
  examId: string | null;
}

const AssignExamDialog: React.FC<AssignExamDialogProps> = ({ open, onClose, onAssign, examId }) => {
  const [classId, setClassId] = React.useState('');
  const [availableAt, setAvailableAt] = React.useState<string>('');
  const [endAt, setEndAt] = React.useState<string>('');
  const [maxAttempts, setMaxAttempts] = React.useState<number>(0);
  const [scoringMethod, setScoringMethod] = React.useState<'best' | 'last' | 'average'>('best');
  const [durationMinutes, setDurationMinutes] = React.useState<number>(60);
  const [classes, setClasses] = React.useState<ClassItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [fetchingClasses, setFetchingClasses] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setFetchingClasses(true);
    setError(null);
    axios.get(`${API_BASE_URL}/classes`)
      .then(res => setClasses(res.data.classes || []))
      .catch(() => setError('Failed to load classes'))
      .finally(() => setFetchingClasses(false));
  }, [open]);

  const handleAssign = async () => {
    if (!classId || !examId || !availableAt || !endAt || !scoringMethod || !durationMinutes) return;
    setLoading(true);
    setError(null);
    try {
      // Convert local picker values to America/Los_Angeles ISO
      const availableFromISO = DateTime.fromJSDate(new Date(availableAt), { zone: 'America/Los_Angeles' }).toISO();
      const availableUntilISO = DateTime.fromJSDate(new Date(endAt), { zone: 'America/Los_Angeles' }).toISO();
      // 1. Fetch all students in the class
      const res = await axios.get(`${API_BASE_URL}/classes/${classId}/students`);
      const students = res.data.students || [];
      if (!students.length) throw new Error('No students found in class');
      // 2. Assign exam to each student
      const assignResults = await Promise.allSettled(
        students.map((student: any) =>
          axios.post(`${API_BASE_URL}/assignments`, {
            user_id: student.user_id,
            exam_id: examId,
            available_from: availableFromISO,
            available_until: availableUntilISO,
            status: 'assigned',
            attempts: 0,
            max_attempts: maxAttempts,
            scoring_method: scoringMethod,
            duration_minutes: durationMinutes
          })
        )
      );
      const failed = assignResults.filter(r => r.status === 'rejected');
      if (failed.length === students.length) {
        setError('Failed to assign exam to all students');
        onAssign(false);
      } else {
        onAssign(true);
      }
    } catch (err: any) {
      setError('Failed to assign exam');
      onAssign(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>Assign Exam to Class</DialogTitle>
      <DialogContent>
        {fetchingClasses ? (
          <CircularProgress />
        ) : error ? (
          <div style={{ color: 'red' }}>{error}</div>
        ) : (
          <>
            <FormControl fullWidth margin="normal">
              <InputLabel id="class-select-label">Class</InputLabel>
              <Select
                labelId="class-select-label"
                value={classId}
                label="Class"
                onChange={e => setClassId(e.target.value as string)}
              >
                {classes.map(cls => (
                  <MenuItem key={cls.class_id} value={cls.class_id}>{cls.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              margin="normal"
              label="Available At"
              type="datetime-local"
              fullWidth
              value={availableAt}
              onChange={e => setAvailableAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              margin="normal"
              label="End At"
              type="datetime-local"
              fullWidth
              value={endAt ?? ''}
              onChange={e => setEndAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              margin="normal"
              label="Max Attempts (0 = Unlimited)"
              type="number"
              fullWidth
              value={maxAttempts}
              onChange={e => setMaxAttempts(Number(e.target.value))}
              InputProps={{ inputProps: { min: 0 } }}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel id="scoring-method-label">Scoring Method</InputLabel>
              <Select
                labelId="scoring-method-label"
                value={scoringMethod}
                label="Scoring Method"
                onChange={e => setScoringMethod(e.target.value as 'best' | 'last' | 'average')}
              >
                <MenuItem value="best">Best</MenuItem>
                <MenuItem value="last">Last</MenuItem>
                <MenuItem value="average">Average</MenuItem>
              </Select>
            </FormControl>
            <TextField
              margin="normal"
              label="Duration (minutes)"
              type="number"
              fullWidth
              value={durationMinutes}
              onChange={e => setDurationMinutes(Number(e.target.value))}
              InputProps={{ inputProps: { min: 1 } }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleAssign} disabled={!classId || !availableAt || !endAt || !scoringMethod || !durationMinutes || loading}>
          {loading ? <CircularProgress size={24} /> : 'Assign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignExamDialog;
