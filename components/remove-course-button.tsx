'use client';

import { Trash2 } from 'lucide-react';
import type { CourseAnalysis } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function RemoveCourseButton({ course, onRemove, compact = false }: { course: CourseAnalysis; onRemove: (course: CourseAnalysis) => void; compact?: boolean }) {
  const label = course.course.code || course.course.title || 'this course';
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button className={compact ? 'remove-course-button compact' : 'remove-course-button'} variant="ghost" size="icon-sm" aria-label={`Remove ${label}`} title={`Remove ${label}`} />}>
        <Trash2 aria-hidden="true" />
      </AlertDialogTrigger>
      <AlertDialogContent className="remove-course-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {label}?</AlertDialogTitle>
          <AlertDialogDescription>This removes the analysis and its saved original file from this browser. It cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep course</AlertDialogCancel>
          <AlertDialogCancel variant="destructive" onClick={() => onRemove(course)}>Remove course</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
