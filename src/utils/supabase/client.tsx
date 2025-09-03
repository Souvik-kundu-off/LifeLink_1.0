import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createClient(supabaseUrl, publicAnonKey);

// Database types for type safety
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          phone_number: string | null;
          date_of_birth: string | null;
          blood_group: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Not Set';
          location: any | null;
          availability_status: 'Available' | 'Unavailable' | 'Recently Donated';
          profile_complete: boolean;
          role: 'individual' | 'hospital_admin' | 'platform_admin';
          hospital_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          phone_number?: string | null;
          date_of_birth?: string | null;
          blood_group?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Not Set';
          location?: any | null;
          availability_status?: 'Available' | 'Unavailable' | 'Recently Donated';
          profile_complete?: boolean;
          role?: 'individual' | 'hospital_admin' | 'platform_admin';
          hospital_id?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          phone_number?: string | null;
          date_of_birth?: string | null;
          blood_group?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Not Set';
          location?: any | null;
          availability_status?: 'Available' | 'Unavailable' | 'Recently Donated';
          profile_complete?: boolean;
          role?: 'individual' | 'hospital_admin' | 'platform_admin';
          hospital_id?: string | null;
        };
      };
      hospitals: {
        Row: {
          id: string;
          name: string;
          address: string;
          location: any | null;
          contact_person_name: string;
          contact_info: string;
          license_number: string;
          application_date: string;
          status: 'pending_review' | 'approved' | 'suspended';
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address: string;
          location?: any | null;
          contact_person_name: string;
          contact_info: string;
          license_number: string;
          application_date?: string;
          status?: 'pending_review' | 'approved' | 'suspended';
        };
        Update: {
          id?: string;
          name?: string;
          address?: string;
          location?: any | null;
          contact_person_name?: string;
          contact_info?: string;
          license_number?: string;
          application_date?: string;
          status?: 'pending_review' | 'approved' | 'suspended';
        };
      };
      blood_requests: {
        Row: {
          id: string;
          requester_id: string;
          patient_name: string;
          patient_age: number;
          blood_group_needed: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
          urgency: 'Critical' | 'High' | 'Medium' | 'Low';
          hospital_id: string;
          status: 'pending_verification' | 'active' | 'fulfilled' | 'cancelled';
          created_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          patient_name: string;
          patient_age: number;
          blood_group_needed: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
          urgency: 'Critical' | 'High' | 'Medium' | 'Low';
          hospital_id: string;
          status?: 'pending_verification' | 'active' | 'fulfilled' | 'cancelled';
        };
        Update: {
          id?: string;
          requester_id?: string;
          patient_name?: string;
          patient_age?: number;
          blood_group_needed?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
          urgency?: 'Critical' | 'High' | 'Medium' | 'Low';
          hospital_id?: string;
          status?: 'pending_verification' | 'active' | 'fulfilled' | 'cancelled';
        };
      };
      donations: {
        Row: {
          id: string;
          donor_id: string;
          hospital_id: string;
          donation_date: string;
          request_id: string | null;
        };
        Insert: {
          id?: string;
          donor_id: string;
          hospital_id: string;
          donation_date?: string;
          request_id?: string | null;
        };
        Update: {
          id?: string;
          donor_id?: string;
          hospital_id?: string;
          donation_date?: string;
          request_id?: string | null;
        };
      };
    };
  };
}