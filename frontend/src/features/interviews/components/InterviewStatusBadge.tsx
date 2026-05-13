import { Badge } from '@/components/ui';
import type { InterviewStatus } from '../types';
import { INTERVIEW_STATUS_LABELS } from '../types';

interface Props {
  status: InterviewStatus;
}

export default function InterviewStatusBadge({ status }: Props) {
  const map: Record<InterviewStatus, "blue" | "green" | "red" | "amber"> = {
    scheduled: 'blue',
    completed: 'green',
    cancelled: 'red',
    no_show: 'amber',
  };

  return (
    <Badge variant={map[status]} dot>
      {INTERVIEW_STATUS_LABELS[status]}
    </Badge>
  );
}
