import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box } from '@mui/material';

interface NewExamDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (exam: { 
    title: string; 
    instructions: string; 
    duration_minutes: number; 
    max_attempts: number; 
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
  const [title, setTitle] = useState<string>(initialTitle);
  const [instructions, setInstructions] = useState<string>(initialInstructions);
  const [duration, setDuration] = useState<string>(initialDuration ? String(initialDuration) : '');
  const [maxAttempts, setMaxAttempts] = useState<string>(initialMaxAttempts ? String(initialMaxAttempts) : '0');

  const [error, setError] = useState('');

  useEffect(() => {
    setTitle(initialTitle);
    setInstructions(initialInstructions);
    setDuration(initialDuration ? String(initialDuration) : '');
    setMaxAttempts(initialMaxAttempts ? String(initialMaxAttempts) : '0');


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

    setError('');
    onCreate({ 
      title, 
      instructions, 
      duration_minutes, 
      max_attempts
    });
    setTitle('');
    setInstructions('');
    setDuration('');
    setMaxAttempts('0');


  };

  const handleClose = () => {
    setError('');
    setTitle('');
    setInstructions('');
    setDuration('');
    setMaxAttempts('0');


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
