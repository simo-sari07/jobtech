import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getInterviewsApi, 
  getInterviewDetailApi, 
  scheduleInterviewApi, 
  updateInterviewApi, 
  submitEvaluationApi,
  deleteInterviewApi,
} from '../api';
import type { CreateInterviewRequest, UpdateInterviewRequest, CreateEvaluationRequest } from '../types';
import toast from 'react-hot-toast';

export const useInterviews = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: ['interviews', params],
    queryFn: () => getInterviewsApi(params),
  });
};

export const useInterviewDetail = (id: number | string | undefined) => {
  return useQuery({
    queryKey: ['interviews', id],
    queryFn: () => getInterviewDetailApi(id!),
    enabled: !!id,
  });
};

export const useScheduleInterview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: scheduleInterviewApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      toast.success('Interview scheduled successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to schedule interview');
    },
  });
};

export const useUpdateInterview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string, payload: UpdateInterviewRequest }) => 
      updateInterviewApi(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      queryClient.invalidateQueries({ queryKey: ['interviews', data.id] });
      toast.success('Interview updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Update failed');
    },
  });
};

export const useSubmitEvaluation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string, payload: CreateEvaluationRequest }) => 
      submitEvaluationApi(id, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      queryClient.invalidateQueries({ queryKey: ['interviews', variables.id] });
      toast.success('Evaluation submitted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to submit evaluation');
    },
  });
};

export const useDeleteInterview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => deleteInterviewApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      toast.success('Interview deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete interview');
    },
  });
};
