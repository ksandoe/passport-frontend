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
  duration_minutes: initialDuration = 60,
  max_attempts: initialMaxAttempts = 1
}) => {
  const [title, setTitle] = useState<string>(initialTitle);
  const [instructions, setInstructions] = useState<string>(initialInstructions);
  const [duration, setDuration] = useState<number>(initialDuration);
  const [maxAttempts, setMaxAttempts] = useState<number>(initialMaxAttempts);
  const [error, setError] = useState('');

  useEffect(() => {
    setTitle(initialTitle);
    setInstructions(initialInstructions);
    setDuration(initialDuration);
    setMaxAttempts(initialMaxAttempts);
  }, [initialTitle, initialInstructions, initialDuration, initialMaxAttempts, open]);

  const handleSubmit = async () => {
    if (!title) {
      setError('Title is required.');
      return;
    }
    if (!duration || duration <= 0) {
      setError('Duration (minutes) is required and must be positive.');
      return;
    }
    if (!maxAttempts || maxAttempts <= 0) {
      setError('Max attempts is required and must be positive.');
      return;
    }
    setError('');
    onCreate({ 
      title, 
      instructions,
      duration_minutes: duration,
      max_attempts: maxAttempts
    });
    setTitle('');
    setInstructions('');
    setDuration(initialDuration);
    setMaxAttempts(initialMaxAttempts);
  };

  const handleClose = () => {
    setError('');
    setTitle('');
    setInstructions('');
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
            type="number"
            value={duration}
            onChange={e => setDuration(Number(e.target.value))}
            required
            inputProps={{ min: 1 }}
          />
          <TextField
            label="Max Attempts"
            type="number"
            value={maxAttempts}
            onChange={e => setMaxAttempts(Number(e.target.value))}
            required
            inputProps={{ min: 1 }}
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
