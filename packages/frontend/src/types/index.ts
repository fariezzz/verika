// packages/frontend/src/types/index.ts
// Definisi tipe data sistem nilai Zero Trust

export interface User {
  id: number;
  username: string;
  nama: string;
  role: 'admin' | 'dosen' | 'mahasiswa';
  identifier: string | null; // NIM (Mahasiswa) atau NIP (Dosen)
  email?: string;
  deviceId?: string;
}

export interface NilaiItem {
  id: number;
  class_id: number;
  student_id?: number;
  nilai_angka: number;
  nilai_huruf: string;
  bobot: number;
  is_final: boolean;
  updated_at: string;
  kode_mk?: string;
  nama_mk?: string;
  sks?: number;
  semester?: string;
  kelas?: string;
  dosen_pengampu?: string;
  nama_mahasiswa?: string;
  nim?: string;
  email?: string;
}

export interface ClassItem {
  id: number;
  kode_mk: string;
  nama_mk: string;
  sks: number;
  semester: string;
  kelas: string;
  is_finalized: boolean;
  finalized_at: string | null;
  sync_status: 'none' | 'pending' | 'synced' | 'failed';
  sync_message?: string;
  peserta: NilaiItem[];
}

export interface TranskripItem {
  id: number;
  kode_mk: string;
  nama_mk: string;
  sks: number;
  nilai_huruf: string;
  bobot: number;
  mutu: number;
  semester: string;
  synced_at: string;
}

export interface TranskripSemester {
  semester: string;
  sks: number;
  mutu: number;
  ips: string;
  mata_kuliah: TranskripItem[];
}

export interface TranskripResponse {
  mahasiswa: User;
  ringkasan: {
    total_sks: number;
    total_mutu: string;
    ipk: string;
    total_semester: number;
  };
  semesters: TranskripSemester[];
  raw_items: TranskripItem[];
}

export interface AuditLog {
  id: number;
  timestamp: string;
  subject: string;
  role: string;
  endpoint: string;
  method: string;
  device_id: string | null;
  ip_address: string | null;
  decision: 'ALLOW' | 'DENY';
  reason: string;
  status_code: number;
}
