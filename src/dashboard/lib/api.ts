import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Tipos
export interface AccessLog {
  id_log: number;
  id_card: string | number; // varchar no banco
  id_lock: number;
  access_time: string;
  access_result: string;
  user_id?: number;
  group_id?: number;
  pin_validated?: boolean | number;
}

export interface User {
  id_user: number;
  name: string;
  email: string;
  user_type: string;
  created_at: string;
}

export interface Card {
  id_card: string | number; // varchar no banco
  card_type: string;
  user_id?: number;
  group_id?: number;
}

export interface Lock {
  id_lock: number;
  name: string;
  station_id: number;
  esp_id: number;
  locks_type: string;
  broker_id?: number;
}

export interface Station {
  id_station: number;
  name: string;
  broker_id?: number;
}

export interface ServiceGroup {
  id_group: number;
  group_name: string;
  leader_user_id: number;
}

export interface StationDetail {
  station: Station;
  locks: Lock[];
  logs: AccessLog[];
  stats: {
    operational_locks: number;
    active_users: number;
    denied_accesses: number;
    total_accesses: number;
  };
}

// Funções de API
export const fetchAccessLogs = async (): Promise<AccessLog[]> => {
  const response = await api.get('/');
  return response.data;
};

export const fetchUsers = async (): Promise<User[]> => {
  const response = await api.get('/users');
  return response.data;
};

export const fetchCards = async (): Promise<Card[]> => {
  const response = await api.get('/cards');
  return response.data;
};

export const fetchLocks = async (): Promise<Lock[]> => {
  const response = await api.get('/locks');
  return response.data;
};

export const fetchStations = async (): Promise<Station[]> => {
  const response = await api.get('/stations');
  return response.data;
};

export const fetchStationDetail = async (stationId: number): Promise<StationDetail> => {
  const response = await api.get(`/stations/${stationId}`);
  return response.data;
};

export const fetchServiceGroups = async (): Promise<ServiceGroup[]> => {
  const response = await api.get('/service-groups');
  return response.data;
};

export const createLock = async (lockData: {
  name: string;
  station_id: number;
  esp_id: number;
  locks_type?: string;
  broker_id?: number | null;
  broker_ip?: string;
}): Promise<Lock> => {
  const response = await api.post('/locks', lockData);
  return response.data;
};

export const createServiceGroup = async (groupData: {
  leader_name: string;
  group_password: string;
  member_ids: number[];
  group_name?: string;
}) => {
  const response = await api.post('/service-groups', groupData);
  return response.data;
};

// Funções de criação
export const createUser = async (userData: {
  name: string;
  email: string;
  user_type: string;
}): Promise<User> => {
  const response = await api.post('/users', userData);
  return response.data;
};

export const createCard = async (cardData: {
  id_card: string;
  card_type: string;
  user_id?: number;
  group_id?: number;
}): Promise<Card> => {
  const response = await api.post('/cards', cardData);
  return response.data;
};

// Permissões
export interface Permission {
  id_permission: number;
  permission_name: string;
  description?: string;
  created_at?: string;
}

export const fetchPermissions = async (): Promise<Permission[]> => {
  const response = await api.get('/permissions');
  return response.data;
};

export const createPermission = async (data: {
  permission_name: string;
  description?: string;
}): Promise<Permission> => {
  const response = await api.post('/permissions', data);
  return response.data;
};

export default api;

