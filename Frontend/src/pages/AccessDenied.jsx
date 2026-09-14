import React from 'react';
import { Shield, Home, Lock, AlertTriangle, ArrowLeft, UserX, Server, EyeOff, Clock } from 'lucide-react';

const AccessDenied = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
      {/* Enhanced Background Elements */}
      <div className="absolute inset-0">
        {/* Subtle Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-5 dark:opacity-10"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
        
        {/* Floating Security Icons */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute text-red-300/20 dark:text-red-400/10 animate-float"
            style={{
              left: `${5 + i * 8}%`,
              top: `${15 + (i % 4) * 20}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${6 + i % 4}s`,
            }}
          >
            <Lock className="w-8 h-8" />
          </div>
        ))}

        {/* Animated Background Orbs */}
        <div className="absolute top-1/4 -left-10 w-72 h-72 bg-red-100/30 dark:bg-red-900/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-10 w-72 h-72 bg-orange-100/30 dark:bg-orange-900/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-0 text-center">
        {/* Main Content Container */}
        <div className="w-full max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="mb-12">
            {/* Status Badge */}
            <div className="inline-flex items-center gap-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border border-red-200 dark:border-red-800 rounded-full px-6 py-3 mb-8 shadow-lg">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
              <span className="text-red-600 dark:text-red-400 font-mono text-sm font-semibold tracking-widest">
                403 FORBIDDEN
              </span>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
            </div>

            {/* Main Icon */}
            <div className="relative mb-8">
              <div className="relative inline-flex items-center justify-center">
                {/* Outer Glow */}
                <div className="absolute inset-0 bg-red-500/20 dark:bg-red-500/10 blur-2xl rounded-full animate-pulse"></div>
                
                {/* Shield Container */}
                <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl border border-red-100 dark:border-red-900/50">
                  <Shield className="w-24 h-24 text-red-500 dark:text-red-400" />
                  
                  {/* Animated Lock */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Lock className="w-12 h-12 text-red-600 dark:text-red-300 animate-bounce" 
                          style={{ animationDuration: '2s' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Title & Description */}
            <div className="max-w-2xl mx-auto">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-800 dark:text-white mb-6 leading-tight">
                Access 
                <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent"> Restricted</span>
              </h1>
              
              <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                You don't have the required permissions to access this resource. 
                This area is protected and requires proper authorization.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* Primary Button */}
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="group relative bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-3 min-w-[200px] justify-center"
            >
              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              
              <Home className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
              <span className="relative">Return to Safety</span>
            </button>

            {/* Secondary Button */}
            <button
              onClick={() => window.history.back()}
              className="group relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-3 min-w-[200px] justify-center hover:border-red-300 dark:hover:border-red-700"
            >
              <ArrowLeft className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" />
              <span>Go Back</span>
            </button>
          </div>
        </div>
      </div>
      {/* Custom CSS for float animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AccessDenied;