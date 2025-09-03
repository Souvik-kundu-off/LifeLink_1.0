import React, { useState, useEffect } from 'react';
import { X, Heart, MapPin, User, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useUser } from '../../hooks/useUser';
import { supabase, Database } from '../../utils/supabase/client';

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Hospital = Database['public']['Tables']['hospitals']['Row'];

export default function CreateRequestModal({ isOpen, onClose, onSuccess }: CreateRequestModalProps) {
  const { user } = useUser();
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
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .eq('status', 'approved')
        .order('name');

      if (error) {
        console.error('Error fetching hospitals:', error);
        return;
      }

      setHospitals(data || []);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
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
    setIsLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.patient_name.trim()) {
        setError('Patient name is required');
        setIsLoading(false);
        return;
      }

      if (!formData.patient_age.trim()) {
        setError('Patient age is required');
        setIsLoading(false);
        return;
      }

      const age = parseInt(formData.patient_age);
      if (isNaN(age) || age < 0 || age > 150) {
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
        setError('Hospital is required');
        setIsLoading(false);
        return;
      }

      // Submit blood request
      const { error } = await supabase
        .from('blood_requests')
        .insert([
          {
            requester_id: user?.id,
            patient_name: formData.patient_name.trim(),
            patient_age: age,
            blood_group_needed: formData.blood_group_needed,
            urgency: formData.urgency,
            hospital_id: formData.hospital_id,
            status: 'pending_verification',
            additional_notes: formData.additional_notes.trim() || null
          }
        ]);

      if (error) {
        console.error('Error creating request:', error);
        setError(error.message || 'Failed to create request. Please try again.');
        setIsLoading(false);
        return;
      }

      // Reset form and close modal
      setFormData({
        patient_name: '',
        patient_age: '',
        blood_group_needed: '',
        urgency: '',
        hospital_id: '',
        additional_notes: ''
      });
      setError('');
      onSuccess();
    } catch (err: any) {
      console.error('Error creating request:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Heart className="h-5 w-5 mr-2 text-red-600" />
              Create Blood Request
            </CardTitle>
            <CardDescription>
              Submit a new blood donation request for a patient in need
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert className="mb-6" variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Patient Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Patient Information
              </h3>
              
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
                    value={formData.patient_age}
                    onChange={(e) => handleInputChange('patient_age', e.target.value)}
                    placeholder="Age in years"
                    min="0"
                    max="150"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Blood Requirements */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <Heart className="h-4 w-4 mr-2" />
                Blood Requirements
              </h3>
              
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
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
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
                      <SelectValue placeholder="Select urgency level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Critical">Critical (Immediate)</SelectItem>
                      <SelectItem value="High">High (Within 24 hours)</SelectItem>
                      <SelectItem value="Medium">Medium (Within 3 days)</SelectItem>
                      <SelectItem value="Low">Low (Within a week)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Hospital Selection */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                Hospital Selection
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="hospital_id">Select Hospital *</Label>
                {loadingHospitals ? (
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Loading hospitals...
                  </div>
                ) : (
                  <Select
                    value={formData.hospital_id}
                    onValueChange={(value) => handleInputChange('hospital_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a hospital" />
                    </SelectTrigger>
                    <SelectContent>
                      {hospitals.map((hospital) => (
                        <SelectItem key={hospital.id} value={hospital.id}>
                          {hospital.name} - {hospital.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                placeholder="Any additional information about the patient's condition, special requirements, or notes for donors..."
                rows={4}
              />
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Request...
                  </>
                ) : (
                  <>
                    <Heart className="h-4 w-4 mr-2" />
                    Create Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}