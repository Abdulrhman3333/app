import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getAuthorName, setAuthorName as setStorageAuthorName } from '@/lib/auth';

interface AuthorNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNameSet: (name: string) => void;
}

export function AuthorNameDialog({ open, onOpenChange, onNameSet }: AuthorNameDialogProps) {
  const [name, setName] = useState(getAuthorName());
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى إدخال اسمك');
      return;
    }
    setStorageAuthorName(name.trim());
    onNameSet(name.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!getAuthorName()) return; // don't allow closing if no name is set
      onOpenChange(val);
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>أهلاً بك في الاجتماع</DialogTitle>
          <DialogDescription>
            يرجى إدخال اسمك للمشاركة وإضافة المشكلات والحلول.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="الاسم الكريم"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full">متابعة</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
