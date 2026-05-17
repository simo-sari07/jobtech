import client from '@/api/client';
import { INTERVIEWS_ENDPOINTS } from '@/api/endpoints';
import type { 
  Interview, 
  CreateInterviewRequest, 
  UpdateInterviewRequest, 
  CreateEvaluationRequest,
  Evaluation
} from './types';

export const getInterviewsApi = async (params?: Record<string, any>) => {
  const { data } = await client.get(INTERVIEWS_ENDPOINTS.LIST, { params });
  return data; // Returns { results: Interview[], count: number, ... }
};

export const getInterviewDetailApi = async (id: number | string) => {
  const { data } = await client.get(INTERVIEWS_ENDPOINTS.DETAIL(id));
  return data as Interview;
};

export const scheduleInterviewApi = async (payload: CreateInterviewRequest) => {
  const { data } = await client.post(INTERVIEWS_ENDPOINTS.LIST, payload);
  return data as Interview;
};

export const updateInterviewApi = async (id: number | string, payload: UpdateInterviewRequest) => {
  const { data } = await client.patch(INTERVIEWS_ENDPOINTS.DETAIL(id), payload);
  return data as Interview;
};

export const submitEvaluationApi = async (id: number | string, payload: CreateEvaluationRequest) => {
  const { data } = await client.post(INTERVIEWS_ENDPOINTS.EVALUATE(id), payload);
  return data as Evaluation;
};

export const getEvaluationApi = async (id: number | string) => {
  const { data } = await client.get(INTERVIEWS_ENDPOINTS.EVALUATION(id));
  return data as Evaluation;
};

export const deleteInterviewApi = async (id: number | string) => {
  await client.delete(INTERVIEWS_ENDPOINTS.DELETE(id));
};
