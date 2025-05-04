import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box } from '@mui/material';
import { DateTime } from 'luxon';

interface NewExamDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (exam: { 
    title: string; 
    instructions: string; 
    duration_minutes: number; 
    max_attempts: number; 
    available_at: string; 
    end_at: string 
  }) => void;
  title?: string;
  instructions?: string;
  duration_minutes?: number;
  max_attempts?: number;
}

const NewExamDialog: React.FC<NewExamDialogProps> = ({ 
  open, 
  onClose, 
  onCreate, 
  title: initialTitle = '', 
  instructions: initialInstructions = '', 
  duration_minutes: initialDuration = 0, 
  max_attempts: initialMaxAttempts = 0 
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [instructions, setInstructions] = useState(initialInstructions);
  const [duration, setDuration] = useState(initialDuration ? String(initialDuration) : '');
  const [maxAttempts, setMaxAttempts] = useState(initialMaxAttempts ? String(initialMaxAttempts) : '0');
  const [availableAt, setAvailableAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setTitle(initialTitle);
    setInstructions(initialInstructions);
    setDuration(initialDuration ? String(initialDuration) : '');
    setMaxAttempts(initialMaxAttempts ? String(initialMaxAttempts) : '0');
    setAvailableAt('');
    setEndAt('');
  }, [initialTitle, initialInstructions, initialDuration, initialMaxAttempts, open]);

  const handleSubmit = async () => {
    if (!title || !duration) {
      setError('Title and duration are required.');
      return;
    }
    const duration_minutes = parseInt(duration, 10);
    const max_attempts = parseInt(maxAttempts, 10);
    if (isNaN(duration_minutes) || duration_minutes <= 0) {
      setError('Duration must be a positive number.');
      return;
    }
    if (isNaN(max_attempts) || max_attempts < 0) {
      setError('Max attempts must be 0 or greater.');
      return;
    }
    if (availableAt && endAt && new Date(availableAt) >= new Date(endAt)) {
      setError('Available From date must be before Available Until date.');
      return;
    }
    setError('');
    const availableAtISO = DateTime.fromJSDate(new Date(availableAt), { zone: 'America/Los_Angeles' }).toISO();
    const endAtISO = DateTime.fromJSDate(new Date(endAt), { zone: 'America/Los_Angeles' }).toISO();
    onCreate({ 
      title, 
      instructions, 
      duration_minutes, 
      max_attempts, 
      available_at: availableAtISO, 
      end_at: endAtISO 
    });
    setTitle('');
    setInstructions('');
    setDuration('');
    setMaxAttempts('0');
    setAvailableAt('');
    setEndAt('');
  };

  const handleClose = () => {
    setError('');
    setTitle('');
    setInstructions('');
    setDuration('');
    setMaxAttempts('0');
    setAvailableAt('');
    setEndAt('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Exam Details</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <TextField
            label="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            autoFocus
          />
          <TextField
            label="Instructions"
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            multiline
            minRows={3}
          />
          <TextField
            label="Duration (minutes)"
            value={duration}
            onChange={e => setDuration(e.target.value.replace(/[^0-9]/g, ''))}
            required
            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
          />
          <TextField
            label="Max Attempts (0 = unlimited)"
            value={maxAttempts}
            onChange={e => setMaxAttempts(e.target.value.replace(/[^0-9]/g, ''))}
            required
            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', min: 0 }}
          />
          <TextField
            margin="normal"
            label="Available From"
            type="datetime-local"
            fullWidth
            value={availableAt}
            onChange={e => setAvailableAt(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            margin="normal"
            label="Available Until"
            type="datetime-local"
            fullWidth
            value={endAt}
            onChange={e => setEndAt(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          {error && <Box color="error.main">{error}</Box>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Submit</Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewExamDialog;
