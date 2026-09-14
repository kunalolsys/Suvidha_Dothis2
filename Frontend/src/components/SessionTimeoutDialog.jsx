import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

import Cookies from 'js-cookie';

const SessionTimeoutDialog = ({ open, onCancel }) => {
  const navigate = useNavigate();

  const handleLogin = () => {
    onCancel(); // Close the modal
    // Clear all auth-related cookies
    Cookies.remove('isLoggedIn');
    Cookies.remove('name');
    Cookies.remove('email');
    Cookies.remove('role');
    Cookies.remove('token');
    Cookies.remove('userId');
    Cookies.remove('departmentName');
    Cookies.remove('permissions');
    navigate('/');
  };

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-yellow-500 mr-2" />
            Session Timeout
          </DialogTitle>
          <DialogDescription className="pt-2">
            Your session has expired. Please log in again to continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4">
          <Button onClick={handleLogin} className="w-full">Login</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SessionTimeoutDialog;
