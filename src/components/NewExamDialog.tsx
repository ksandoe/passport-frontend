import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box } from '@mui/material';

interface NewExamDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (exam: { 
    title: string; 
    instructions: string; 
  }) => void;
  title?: string;
  instructions?: string;
}

const NewExamDialog: React.FC<NewExamDialogProps> = ({ 
  open, 
  onClose, 
  onCreate, 
  title: initialTitle = '', 
  instructions: initialInstructions = ''
}) => {
  const [title, setTitle] = useState<string>(initialTitle);
  const [instructions, setInstructions] = useState<string>(initialInstructions);
  const [error, setError] = useState('');

  useEffect(() => {
    setTitle(initialTitle);
    setInstructions(initialInstructions);
  }, [initialTitle, initialInstructions, open]);

  const handleSubmit = async () => {
    if (!title) {
      setError('Title is required.');
      return;
    }
    setError('');
    onCreate({ 
      title, 
      instructions
    });
    setTitle('');
    setInstructions('');


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
