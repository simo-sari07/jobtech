import { Phone, Video, Users, Code } from 'lucide-react';
import type { InterviewType } from '../types';

interface Props {
  type: InterviewType;
  size?: number;
  className?: string;
}

export default function InterviewTypeIcon({ type, size = 16, className = "" }: Props) {
  switch (type) {
    case 'phone':     return <Phone size={size} className={className} />;
    case 'video':     return <Video size={size} className={className} />;
    case 'onsite':    return <Users size={size} className={className} />;
    case 'technical': return <Code size={size} className={className} />;
    default:          return <Users size={size} className={className} />;
  }
}
