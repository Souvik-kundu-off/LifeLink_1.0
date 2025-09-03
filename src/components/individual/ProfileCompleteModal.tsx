import React, { useState } from 'react';
import { User, MapPin, Calendar, Phone, Save } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { useAuth } from '../AuthProvider';
import { supabase, Database } from '../../utils/supabase/client';

interface ProfileCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  profile: Database['public']['Tables']['profiles']['Row'];
}

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const availabilityOptions = [
  { value: 'Available', label: 'Available' },
  { value: 'Unavailable', label: 'Unavailable' },
  { value: 'Recently Donated', label: 'Recently Donated' }
];

export default function ProfileCompleteModal({ 
  isOpen, 
  onClose, 
  user, 
  profile 
}: ProfileCompleteModalProps) {
  const { updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    phone_number: profile.phone_number || '',
    date_of_birth: profile.date_of_birth || '',
    blood_group: profile.blood_group || 'Not Set',
    availability_status: profile.availability_status || 'Available'
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'pending' | 'granted' | 'denied'>('pending');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationPermission('granted');
        },
        (error) => {
          setLocationPermission('denied');
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.full_name.trim()) {
        setError('Full name is required');
        setIsLoading(false);
        return;
      }

      if (!formData.date_of_birth) {
        setError('Date of birth is required');
        setIsLoading(false);
        return;
      }

      if (formData.blood_group === 'Not Set') {
        setError('Please select your blood group');
        setIsLoading(false);
        return;
      }

      // Get current location
      let location = null;
      try {
        const coords = await getCurrentLocation();
        location = `POINT(${coords.lng} ${coords.lat})`;
      } catch (locationError) {
        console.warn('Could not get location:', locationError);
        // Continue without location - it's not mandatory
      }

      // Prepare update data
      const updateData: any = {
        full_name: formData.full_name.trim(),
        phone_number: formData.phone_number.trim() || null,
        date_of_birth: formData.date_of_birth,
        blood_group: formData.blood_group as any,
        availability_status: formData.availability_status as any,
        profile_complete: true
      };

      if (location) {
        updateData.location = location;
      }

      await updateProfile(updateData);
      onClose();
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'An error occurred while updating your profile');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const isEligibleAge = formData.date_of_birth ? 
    calculateAge(formData.date_of_birth) >= 18 && calculateAge(formData.date_of_birth) <= 65 : 
    true;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Complete Your Profile
          </DialogTitle>
          <DialogDescription>
            Please provide the following information to access all features and respond to donation requests.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone Number</Label>
            <Input
              id="phone_number"
              type="tel"
              value={formData.phone_number}
              onChange={(e) => handleInputChange('phone_number', e.target.value)}
              placeholder="Enter your phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_of_birth">Date of Birth *</Label>
            <Input
              id="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
              required
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
              min={new Date(new Date().setFullYear(new Date().getFullYear() - 65)).toISOString().split('T')[0]}
            />
            {formData.date_of_birth && !isEligibleAge && (
              <Alert variant="destructive">
                <AlertDescription>
                  You must be between 18 and 65 years old to donate blood.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="blood_group">Blood Group *</Label>
            <Select
              value={formData.blood_group}
              onValueChange={(value) => handleInputChange('blood_group', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your blood group" />
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
            <Label htmlFor="availability_status">Availability Status</Label>
            <Select
              value={formData.availability_status}
              onValueChange={(value) => handleInputChange('availability_status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your availability" />
              </SelectTrigger>
              <SelectContent>
                {availabilityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Alert>
            <MapPin className="h-4 w-4" />
            <AlertDescription>
              We'll request your location to help match you with nearby donation opportunities. 
              You can skip this if you prefer.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !isEligibleAge}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}