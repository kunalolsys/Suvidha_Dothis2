import React, { useState } from 'react';
import { Rocket, Send, FileText, HardDrive } from 'lucide-react';

// shadcn/ui components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { Textarea } from '../../components/ui/textarea';

// --- Main Component ---
const Launchpad = () => {
  const [selectedFms, setSelectedFms] = useState(null);

  const fmsOptions = [
    { id: 'truck-security', title: 'Truck Entry Security Check', icon: <FileText className="h-5 w-5 mr-3 text-blue-500" /> },
    { id: 'it-support', title: 'New IT Support Ticket', icon: <HardDrive className="h-5 w-5 mr-3 text-green-500" /> }
  ];

  const getNavItemClass = (fmsId) => {
    const baseClass = "flex items-center p-3 rounded-lg cursor-pointer text-sm font-medium transition-all";
    if (selectedFms === fmsId) {
      return `${baseClass} bg-blue-100 text-blue-800 shadow-inner border border-blue-200`;
    }
    return `${baseClass} text-gray-700 hover:bg-gray-100 hover:shadow-sm`;
  };

  const selectedFmsDetails = fmsOptions.find(fms => fms.id === selectedFms);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="mx-auto">
        <Card className="shadow-xl border-0 overflow-hidden">
        <h1 className="text-2xl font-bold mx-6">Launchpad</h1>
          
          <CardContent className="px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* --- Left Column: Available FMS --- */}
              <Card className="md:col-span-1 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-800">Available FMS</CardTitle>
                </CardHeader>
                <CardContent>
                  <nav className="space-y-3">
                    {fmsOptions.map(fms => (
                      <div
                        key={fms.id}
                        className={getNavItemClass(fms.id)}
                        onClick={() => setSelectedFms(fms.id)}
                      >
                        {fms.icon}
                        {fms.title}
                      </div>
                    ))}
                  </nav>
                </CardContent>
              </Card>

              {/* --- Right Column: Initiate New Entry --- */}
              <Card className="md:col-span-2 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-800">
                    {selectedFmsDetails ? `Initiate: ${selectedFmsDetails.title}` : 'Initiate New Entry'}
                  </CardTitle>
                  {!selectedFmsDetails && (
                    <CardDescription>Select an FMS from the left to begin.</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {/* --- Empty State --- */}
                  {!selectedFms && (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-lg">
                      <Rocket className="h-12 w-12 mb-4 text-gray-400" />
                      <p className="font-medium">No FMS Selected</p>
                      <p className="text-sm">Choose an FMS to start a new entry.</p>
                    </div>
                  )}

                  {/* --- Truck Security Form --- */}
                  {selectedFms === 'truck-security' && (
                    <TruckSecurityForm />
                  )}

                  {/* --- IT Support Form --- */}
                  {selectedFms === 'it-support' && (
                    <ItSupportForm />
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};


// --- Form Component for Truck Entry Security Check ---
const TruckSecurityForm = () => {
  return (
    <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
      <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Task Title</Label>
          <p className="font-semibold text-gray-800">Log New Truck Arrival</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Description</Label>
          <p className="text-sm text-gray-600">Record the details of the arriving truck, inspect the documents, and perform the initial security check.</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Type</Label>
          <p className="text-sm font-medium text-purple-700">Timeless FMS</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="attachment-truck" className="font-medium">Attachment</Label>
        <Input id="attachment-truck" type="file" className="bg-white" />
      </div>

      <div className="space-y-3">
        <Label className="font-medium">Checklist</Label>
        <div className="space-y-3 rounded-lg border p-4 bg-white">
          <div className="flex items-center space-x-3">
            <Checkbox id="check-driver" />
            <Label htmlFor="check-driver" className="font-normal text-sm">Driver ID verified</Label>
          </div>
          <div className="flex items-center space-x-3">
            <Checkbox id="check-vehicle" />
            <Label htmlFor="check-vehicle" className="font-normal text-sm">Vehicle registration checked</Label>
          </div>
          <div className="flex items-center space-x-3">
            <Checkbox id="check-seal" />
            <Label htmlFor="check-seal" className="font-normal text-sm">Seal is intact</Label>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Label className="font-medium">Fill Form</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input id="truck-number" placeholder="Truck Number" className="bg-white" />
          <Input id="driver-name" placeholder="Driver Name" className="bg-white" />
          <Input id="entry-gate-number" placeholder="Entry Gate Number" className="bg-white" />
        </div>
      </div>

      <div className="flex justify-end pt-4 mt-4 border-t">
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
          <Send className="h-4 w-4 mr-2" />
          Initiate & Complete Task
        </Button>
      </div>
    </form>
  );
};


// --- Form Component for New IT Support Ticket ---
const ItSupportForm = () => {
  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Task Title</Label>
          <p className="font-semibold text-gray-800">Create New Support Ticket</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Description</Label>
          <p className="text-sm text-gray-600">Log a new issue reported by a user and categorize it for the support team.</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Type</Label>
          <p className="text-sm font-medium text-purple-700">Timeless FMS</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="attachment-it" className="font-medium">Attachment</Label>
        <Input id="attachment-it" type="file" className="bg-white" />
      </div>

      <div className="space-y-4">
        <Label className="font-medium">Fill Form</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input id="employee-name" placeholder="Employee Name" className="bg-white" />
          <Input id="urgency-level" placeholder="Urgency Level (Low, Medium, High)" className="bg-white" />
        </div>
        <Textarea id="issue-category" placeholder="Describe the issue category (e.g., Hardware, Software, Network)..." className="bg-white" />
      </div>

      <div className="flex justify-end pt-4 mt-4 border-t">
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
          <Send className="h-4 w-4 mr-2" />
          Initiate & Complete Task
        </Button>
      </div>
    </form>
  );
};

export default Launchpad;
