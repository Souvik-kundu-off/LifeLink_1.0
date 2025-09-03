import React from 'react';
import { Heart, Hospital, Users, Shield, ArrowRight, Phone, Mail } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface LandingPageProps {
  navigate: (page: string) => void;
}

export default function LandingPage({ navigate }: LandingPageProps) {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-red-600 mr-2" />
              <span className="text-2xl font-bold text-gray-900">Lifelink</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('login')}
                className="text-gray-600 hover:text-gray-900"
              >
                Login
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('test')}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Test Page
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-red-50 to-pink-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
              Connecting Lives Through
              <span className="text-red-600 block">Blood Donation</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              A comprehensive platform connecting donors, recipients, and hospitals 
              to save lives through efficient blood donation management.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg"
                onClick={() => navigate('login')}
              >
                <Users className="mr-2 h-5 w-5" />
                For Individuals
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-50 px-8 py-3 text-lg"
                onClick={() => navigate('login')}
              >
                <Hospital className="mr-2 h-5 w-5" />
                For Hospitals
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Lifelink?
            </h2>
            <p className="text-xl text-gray-600">
              Advanced features designed to make blood donation efficient and accessible
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Smart Matching</h3>
                <p className="text-gray-600">
                  Advanced algorithms match donors with recipients based on blood type, 
                  location, and urgency for optimal results.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Hospital className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Hospital Integration</h3>
                <p className="text-gray-600">
                  Seamless integration with hospitals for real-time blood inventory 
                  management and emergency request handling.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Secure & Reliable</h3>
                <p className="text-gray-600">
                  Bank-level security with verified profiles and secure data handling 
                  to protect sensitive medical information.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Making an Impact
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-red-600 mb-2">1000+</div>
              <div className="text-gray-600">Lives Saved</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-blue-600 mb-2">500+</div>
              <div className="text-gray-600">Active Donors</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-green-600 mb-2">50+</div>
              <div className="text-gray-600">Partner Hospitals</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-purple-600 mb-2">24/7</div>
              <div className="text-gray-600">Emergency Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center mb-4">
                <Heart className="h-8 w-8 text-red-600 mr-2" />
                <span className="text-2xl font-bold">Lifelink</span>
              </div>
              <p className="text-gray-300 mb-4">
                Connecting lives through efficient blood donation management. 
                Every donation counts, every life matters.
              </p>
              <div className="flex space-x-4">
                <div className="flex items-center text-gray-300">
                  <Phone className="h-4 w-4 mr-2" />
                  <span>+1 (555) 123-4567</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <Mail className="h-4 w-4 mr-2" />
                  <span>contact@lifelink.com</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-300">
                <li><button onClick={() => navigate('login')} className="hover:text-white">Individual Login</button></li>
                <li><button onClick={() => navigate('login')} className="hover:text-white">Hospital Login</button></li>
                <li><button onClick={() => navigate('test')} className="hover:text-white">Register Hospital</button></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-300">
                <li><span className="hover:text-white cursor-pointer">Help Center</span></li>
                <li><span className="hover:text-white cursor-pointer">Privacy Policy</span></li>
                <li><span className="hover:text-white cursor-pointer">Terms of Service</span></li>
                <li><button onClick={() => navigate('test')} className="hover:text-white text-sm">Admin Portal</button></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 mt-8 text-center text-gray-400">
            <p>&copy; 2024 Lifelink. All rights reserved. Saving lives through technology.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}