import React, { useState } from 'react';
import { Building2, ArrowLeft, Heart, MapPin, Phone, FileText, Send, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { supabase } from '../utils/supabase/client';

interface HospitalApplicationProps {
  navigate: (page: string) => void;
}

export default function HospitalApplication({ navigate }: HospitalApplicationProps) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact_person_name: '',
    contact_info: '',
    license_number: '',
    additional_info: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
      if (!formData.name.trim()) {
        setError('Hospital name is required');
        setIsLoading(false);
        return;
      }

      if (!formData.address.trim()) {
        setError('Hospital address is required');
        setIsLoading(false);
        return;
      }

      if (!formData.contact_person_name.trim()) {
        setError('Contact person name is required');
        setIsLoading(false);
        return;
      }

      if (!formData.contact_info.trim()) {
        setError('Contact information is required');
        setIsLoading(false);
        return;
      }

      if (!formData.license_number.trim()) {
        setError('License number is required');
        setIsLoading(false);
        return;
      }

      // Submit hospital application directly using Supabase
      const { data, error } = await supabase
        .from('hospitals')
        .insert([
          {
            name: formData.name.trim(),
            address: formData.address.trim(),
            contact_person_name: formData.contact_person_name.trim(),
            contact_info: formData.contact_info.trim(),
            license_number: formData.license_number.trim(),
            application_date: new Date().toISOString().split('T')[0],
            status: 'pending_review'
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error submitting application:', error);
        
        if (error.code === '23505') {
          setError('A hospital with this license number already exists');
        } else {
          setError(error.message || 'Failed to submit application. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error('Error submitting application:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <button
                onClick={() => navigate('landing')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Home
              </button>
              <div className="flex items-center">
                <Heart className="h-8 w-8 text-red-600 mr-2" />
                <span className="text-2xl font-bold text-gray-900">Lifelink</span>
              </div>
              <div className="w-20"></div>
            </div>
          </div>
        </header>

        {/* Success Message */}
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <CardContent className="p-8">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Application Submitted!</h2>
              <p className="text-gray-600 mb-6">
                Thank you for your application. Our team will review your submission and 
                contact you within 2-3 business days.
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('landing')} 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Return to Home
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('hospital-login')} 
                  className="w-full"
                >
                  Hospital Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <button
              onClick={() => navigate('landing')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Home
            </button>
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-red-600 mr-2" />
              <span className="text-2xl font-bold text-gray-900">Lifelink</span>
            </div>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold flex items-center justify-center">
              <Building2 className="h-6 w-6 mr-2" />
              Hospital Registration
            </CardTitle>
            <CardDescription>
              Join our network of partner hospitals to help save lives through efficient blood donation management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Hospital Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <Building2 className="h-4 w-4 mr-2" />
                  Hospital Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="name">Hospital Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter hospital name"
                      required
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="address">Hospital Address *</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Enter complete hospital address"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="license_number">License Number *</Label>
                    <Input
                      id="license_number"
                      value={formData.license_number}
                      onChange={(e) => handleInputChange('license_number', e.target.value)}
                      placeholder="Hospital license number"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  Contact Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_person_name">Contact Person Name *</Label>
                    <Input
                      id="contact_person_name"
                      value={formData.contact_person_name}
                      onChange={(e) => handleInputChange('contact_person_name', e.target.value)}
                      placeholder="Name of contact person"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_info">Contact Information *</Label>
                    <Input
                      id="contact_info"
                      value={formData.contact_info}
                      onChange={(e) => handleInputChange('contact_info', e.target.value)}
                      placeholder="Phone, email, or both"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-2">
                <Label htmlFor="additional_info">Additional Information (Optional)</Label>
                <Textarea
                  id="additional_info"
                  value={formData.additional_info}
                  onChange={(e) => handleInputChange('additional_info', e.target.value)}
                  placeholder="Any additional information about your hospital, specializations, or blood bank facilities..."
                  rows={4}
                />
              </div>

              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Your application will be reviewed by our team. Once approved, you'll receive login credentials 
                  to access the hospital portal. This process typically takes 2-3 business days.
                </AlertDescription>
              </Alert>

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Application
                  </>
                )}
              </Button>
            </form>

            <div className="text-center pt-4 border-t">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <button 
                  onClick={() => navigate('hospital-login')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Sign in here
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}