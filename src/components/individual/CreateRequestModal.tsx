import React, { useState, useEffect } from 'react';
import { FileText, MapPin, AlertTriangle, Save } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { useAuth } from '../AuthProvider';
import { supabase, Database } from '../../utils/supabase/client';

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Hospital extends Database['public']['Tables']['hospitals']['Row'] {}

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const urgencyLevels = [
  { value: 'Critical', label: 'Critical - Immediate need' },
  { value: 'High', label: 'High - Within 24 hours' },
  { value: 'Medium', label: 'Medium - Within 3 days' },
  { value: 'Low', label: 'Low - Within a week' }
];

export default function CreateRequestModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: CreateRequestModalProps) {
  const { user } = useAuth();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [formData, setFormData] = useState({
    patient_name: '',
    patient_age: '',
    blood_group_needed: '',
    urgency: '',
    hospital_id: '',
    additional_notes: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHospitals, setLoadingHospitals] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchHospitals();
    }
  }, [isOpen]);

  const fetchHospitals = async () => {
    setLoadingHospitals(true);
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .eq('status', 'approved')
        .order('name');

      if (error) {
        console.error('Error fetching hospitals:', error);
        setError('Failed to load hospitals. Please try again.');
        return;
      }

      setHospitals(data || []);
    } catch (err) {
      console.error('Error fetching hospitals:', err);
      setError('Failed to load hospitals. Please try again.');
    } finally {
      setLoadingHospitals(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to create a request');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.patient_name.trim()) {
        setError('Patient name is required');
        setIsLoading(false);
        return;
      }

      if (!formData.patient_age || parseInt(formData.patient_age) < 0 || parseInt(formData.patient_age) > 150) {
        setError('Please enter a valid patient age');
        setIsLoading(false);
        return;
      }

      if (!formData.blood_group_needed) {
        setError('Blood group is required');
        setIsLoading(false);
        return;
      }

      if (!formData.urgency) {
        setError('Urgency level is required');
        setIsLoading(false);
        return;
      }

      if (!formData.hospital_id) {
        setError('Hospital selection is required');
        setIsLoading(false);
        return;
      }

      // Create the blood request
      const { data, error } = await supabase
        .from('blood_requests')
        .insert([
          {
            requester_id: user.id,
            patient_name: formData.patient_name.trim(),
            patient_age: parseInt(formData.patient_age),
            blood_group_needed: formData.blood_group_needed as any,
            urgency: formData.urgency as any,
            hospital_id: formData.hospital_id,
            status: 'pending_verification'
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating request:', error);
        setError('Failed to create request. Please try again.');
        setIsLoading(false);
        return;
      }

      // Reset form
      setFormData({
        patient_name: '',
        patient_age: '',
        blood_group_needed: '',
        urgency: '',
        hospital_id: '',
        additional_notes: ''
      });

      onSuccess();
    } catch (err: any) {
      console.error('Error creating request:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedHospital = hospitals.find(h => h.id === formData.hospital_id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Create Blood Donation Request
          </DialogTitle>
          <DialogDescription>
            Create a new request for blood donation. Hospital staff will review and verify your request.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Patient Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patient_name">Patient Name *</Label>
                <Input
                  id="patient_name"
                  value={formData.patient_name}
                  onChange={(e) => handleInputChange('patient_name', e.target.value)}
                  placeholder="Enter patient's full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patient_age">Patient Age *</Label>
                <Input
                  id="patient_age"
                  type="number"
                  min="0"
                  max="150"
                  value={formData.patient_age}
                  onChange={(e) => handleInputChange('patient_age', e.target.value)}
                  placeholder="Enter patient's age"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="blood_group_needed">Blood Group Needed *</Label>
                <Select
                  value={formData.blood_group_needed}
                  onValueChange={(value) => handleInputChange('blood_group_needed', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    {bloodGroups.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="urgency">Urgency Level *</Label>
                <Select
                  value={formData.urgency}
                  onValueChange={(value) => handleInputChange('urgency', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    {urgencyLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Hospital Selection */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Hospital Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="hospital_id">Select Hospital *</Label>
              {loadingHospitals ? (
                <div className="flex items-center justify-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                  <span className="ml-2 text-gray-600">Loading hospitals...</span>
                </div>
              ) : (
                <Select
                  value={formData.hospital_id}
                  onValueChange={(value) => handleInputChange('hospital_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select hospital" />
                  </SelectTrigger>
                  <SelectContent>
                    {hospitals.map((hospital) => (
                      <SelectItem key={hospital.id} value={hospital.id}>
                        {hospital.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {selectedHospital && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 text-gray-500 mt-1 mr-2" />
                    <div className="text-sm">
                      <p className="font-medium">{selectedHospital.name}</p>
                      <p className="text-gray-600">{selectedHospital.address}</p>
                      <p className="text-gray-600">Contact: {selectedHospital.contact_info}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="additional_notes">Additional Notes (Optional)</Label>
            <Textarea
              id="additional_notes"
              value={formData.additional_notes}
              onChange={(e) => handleInputChange('additional_notes', e.target.value)}
              placeholder="Any additional information about the patient or request..."
              rows={3}
            />
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your request will be sent to the selected hospital for verification. 
              Once approved, it will be visible to potential donors in the community.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || loadingHospitals}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Request...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Request
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}